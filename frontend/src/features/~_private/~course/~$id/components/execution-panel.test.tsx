// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  act,
  // eslint-disable-next-line testing-library/no-manual-cleanup -- Vitest globals are disabled.
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { codePulseApi, type CodePulseExecutionResult } from '@/services/codepulse-api';

import { ExecutionConsole, ExecutionPanel } from './execution-panel';

vi.mock('@/services/codepulse-api', () => ({ codePulseApi: { listExecutions: vi.fn() } }));

const execution: CodePulseExecutionResult = {
  id: 'execution-first', state: 'FINISHED', status: 'SUCCESS', mode: 'STDIN',
  sourceCode: 'print("first run")', sourceHash: 'hash', runtime: 'PYTHON',
  assignmentId: 'problem', assignmentVersionId: 'problem-v1', ownerEmail: 'student@gmail.com',
  stdout: '<script>window.compromised = true</script>', stderr: '<img src=x onerror="alert(1)">',
  runtimeMs: 37, memoryUsageKb: 16384, exitCode: 0, executedAt: '2026-10-22T03:00:00Z',
  limits: { cpuTimeLimitMs: 1000, memoryLimitMb: 128, wallTimeLimitMs: 2250 },
};

describe('execution console and history', () => {
  beforeEach(() => {
    vi.mocked(codePulseApi.listExecutions).mockResolvedValue({ status: 200, data: { items: [execution], nextCursor: null } });
  });
  afterEach(() => { cleanup(); vi.resetAllMocks(); vi.useRealTimers(); });

  it('escapes both streams as text and displays measured duration and memory separately from limits', () => {
    render(<ExecutionConsole execution={execution} />);
    const stdout = screen.getByRole('region', { name: 'stdout' });
    const stderr = screen.getByRole('region', { name: 'stderr' });
    expect(stdout).toHaveTextContent(execution.stdout);
    expect(stderr).toHaveTextContent(execution.stderr);
    // eslint-disable-next-line testing-library/no-node-access -- Verify untrusted text never creates DOM elements.
    expect(document.querySelector('script, img')).toBeNull();
    expect(stdout).not.toHaveTextContent(execution.stderr);
    expect(screen.getByText('37 ms')).toBeInTheDocument();
    expect(screen.getByText('16.00 MB (16384 KB)')).toBeInTheDocument();
    expect(screen.getByText(/Giới hạn: 1000 ms CPU · 128 MB/)).toBeInTheDocument();
    expect(screen.getByText(`execution_id: ${execution.id}`)).toBeInTheDocument();
  });

  it('warns for sandbox truncation and bounds oversized legacy output', () => {
    render(<ExecutionConsole execution={{ ...execution, outputTruncated: true, stdout: 'x'.repeat(50000) }} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Output truncated/);
    expect(screen.getByRole('region', { name: 'stdout' })).not.toHaveTextContent('x'.repeat(32001));
    expect(screen.getByText(/Nội dung hiển thị đã bị cắt/)).toBeInTheDocument();
  });

  it('distinguishes infrastructure failures and unknown measurements from student runtime errors', () => {
    const { rerender } = render(<ExecutionConsole execution={{ ...execution, status: 'INTERNAL_ERROR', memoryUsageKb: null, exitCode: null }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Hạ tầng thực thi gặp sự cố');
    expect(screen.getByText('Chưa có số đo')).toBeInTheDocument();
    rerender(<ExecutionConsole execution={{ ...execution, status: 'RUNTIME_ERROR', memoryUsageKb: 512 }} />);
    expect(screen.getByText('Runtime error · Lỗi chương trình')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('512 KB')).toBeInTheDocument();
  });

  it('reloads durable history on remount and opens the selected run snapshot', async () => {
    const newer = { ...execution, id: 'execution-newer', sourceCode: 'changed code', stdout: 'new output', executedAt: '2026-10-22T04:00:00Z' };
    vi.mocked(codePulseApi.listExecutions).mockResolvedValue({ status: 200, data: { items: [newer, execution] } });
    const { unmount } = render(<ExecutionPanel workspaceId="workspace-a" />);
    expect(await screen.findByText('new output')).toBeInTheDocument();
    unmount();
    render(<ExecutionPanel workspaceId="workspace-a" />);
    await screen.findByText('new output');
    fireEvent.click(screen.getByRole('tab', { name: 'Execution History' }));
    fireEvent.click(screen.getByRole('button', { name: /execution-first/ }));
    expect(screen.getByRole('textbox', { name: 'Code snapshot' })).toHaveValue(execution.sourceCode);
    expect(screen.getByRole('textbox', { name: 'Code snapshot' })).toHaveAttribute('readonly');
    expect(within(screen.getByRole('region', { name: 'Execution snapshot' })).getByRole('region', { name: 'stdout' })).toHaveTextContent(execution.stdout);
    expect(codePulseApi.listExecutions).toHaveBeenCalledTimes(2);
    expect(codePulseApi.listExecutions).toHaveBeenCalledWith('workspace-a');
  });

  it('loads older attempts and exposes retry when history cannot be fetched', async () => {
    vi.mocked(codePulseApi.listExecutions).mockRejectedValueOnce(new Error('offline'));
    render(<ExecutionPanel workspaceId="workspace-a" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Execution History' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể tải execution history');
    vi.mocked(codePulseApi.listExecutions).mockResolvedValueOnce({ status: 200, data: { items: [execution], nextCursor: execution.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Làm mới' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Tải lần chạy cũ hơn' }));
    expect(codePulseApi.listExecutions).toHaveBeenLastCalledWith('workspace-a', execution.id);
    expect(await screen.findByRole('button', { name: /execution-first/ })).toBeInTheDocument();
  });

  it('refreshes unfinished runs until their output is available', async () => {
    vi.useFakeTimers();
    vi.mocked(codePulseApi.listExecutions).mockResolvedValueOnce({ status: 200, data: { items: [{ ...execution, state: 'RUNNING', status: 'RUNNING', stdout: '' }] } });
    render(<ExecutionPanel workspaceId="workspace-a" />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByText('RUNNING')).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'stdout' })).toHaveTextContent(execution.stdout);
  });
});
