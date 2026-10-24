"""Trusted container supervisor. Student processes run under a separate UID."""
import json
import math
import os
import resource
import selectors
import signal
import subprocess
import sys
import time

OUTPUT_BYTES = 32000


def cpu_ms():
    # Container-wide accounting includes forks, even if they change process group.
    with open('/sys/fs/cgroup/cpu.stat') as stat:
        return int(dict(line.split() for line in stat)['usage_usec']) / 1000


def run(command, stdin, cpu_limit, memory_mb, wall_limit):
    def restrict():
        os.setsid()
        resource.setrlimit(resource.RLIMIT_AS, (memory_mb * 1048576,) * 2)
        resource.setrlimit(resource.RLIMIT_CPU, (math.ceil(cpu_limit / 1000) + 1,) * 2)
        resource.setrlimit(resource.RLIMIT_FSIZE, (16 * 1048576,) * 2)
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))
        os.setgroups([])
        os.setgid(65534)
        os.setuid(65534)

    start = time.monotonic()
    initial_cpu = cpu_ms()
    # File-backed input avoids blocking the supervisor on an unread stdin pipe.
    with open('/work/stdin', 'wb') as stream:
        stream.write(stdin.encode())
    with open('/work/stdin', 'rb') as stream:
        child = subprocess.Popen(command, stdin=stream, stdout=subprocess.PIPE,
                                 stderr=subprocess.PIPE, cwd='/work/student',
                                 env={'PATH': '/usr/local/bin:/usr/bin:/bin', 'HOME': '/work/student'},
                                 preexec_fn=restrict)
    selector = selectors.DefaultSelector()
    selector.register(child.stdout, selectors.EVENT_READ, 'stdout')
    selector.register(child.stderr, selectors.EVENT_READ, 'stderr')
    output = {'stdout': b'', 'stderr': b''}
    size = 0
    verdict = None
    while selector.get_map() or child.poll() is None:
        if (time.monotonic() - start) * 1000 >= wall_limit or cpu_ms() - initial_cpu >= cpu_limit:
            verdict = 'TIME_LIMIT_EXCEEDED'
            break
        for key, _ in selector.select(0.005):
            chunk = os.read(key.fileobj.fileno(), 8192)
            if not chunk:
                selector.unregister(key.fileobj)
                continue
            remaining = max(0, OUTPUT_BYTES - size)
            output[key.data] += chunk[:remaining]
            size += len(chunk)
            if size > OUTPUT_BYTES:
                verdict = 'OUTPUT_LIMIT_EXCEEDED'
                break
        if verdict:
            break
    # Always reap the process tree; the enclosing container is also force-removed.
    try:
        os.killpg(child.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    child.wait()
    selector.close()
    stdout = output['stdout'].decode(errors='replace')
    stderr = output['stderr'].decode(errors='replace')
    if verdict is None:
        if child.returncode == 0:
            verdict = 'SUCCESS'
        elif child.returncode == -signal.SIGXCPU:
            verdict = 'TIME_LIMIT_EXCEEDED'
        elif 'MemoryError' in stderr or 'std::bad_alloc' in stderr or 'Cannot allocate memory' in stderr:
            verdict = 'MEMORY_LIMIT_EXCEEDED'
        else:
            verdict = 'RUNTIME_ERROR'
    return dict(status=verdict, stdout=stdout, stderr=stderr,
                exitCode=child.returncode, outputTruncated=size > OUTPUT_BYTES,
                runtimeMs=round((time.monotonic() - start) * 1000))


def main():
    job = json.load(sys.stdin)
    os.mkdir('/work/student', 0o777)
    os.chmod('/work/student', 0o777)
    source = '/work/student/main.' + ('cpp' if job['runtime'] == 'CPP' else 'py')
    with open(source, 'w') as stream:
        stream.write(job['sourceCode'])
    if job['runtime'] == 'CPP':
        compile_command = ['g++', '-std=c++17', '-O2', source, '-o', '/work/student/main']
    else:
        # Compile separately: SyntaxError (including IndentationError) is CE.
        compile_command = ['python3', '-I', '-c', 'import ast,sys; ast.parse(open(sys.argv[1]).read())', source]
    result = run(compile_command, '', 10000, 1024, 15000)
    if result['status'] != 'SUCCESS':
        result['status'] = 'COMPILE_ERROR'
        return result
    command = ['/work/student/main'] if job['runtime'] == 'CPP' else ['python3', '-I', '-B', source]
    return run(command, job['input'], job['cpuTimeLimitMs'], job['memoryLimitMb'], job['wallTimeLimitMs'])


try:
    print(json.dumps(main()))
except Exception:
    # Never expose host/worker traces or turn a supervisor failure into RE.
    print(json.dumps(dict(status='INTERNAL_ERROR', stdout='', stderr='Sandbox worker failed.',
                         exitCode=None, runtimeMs=0, outputTruncated=False)))
