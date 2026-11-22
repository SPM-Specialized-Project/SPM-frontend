import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const backendDirectory = process.env.SPM_SMOKE_BACKEND;
assert.ok(backendDirectory, 'A deployed backend directory is required');
const seed = await readFile(join(backendDirectory,'data','seeds.mjs'),'utf8');
const credential = (role) => {
  const expression = new RegExp("\\{ email: '(" + role + "@[^']+)', password: '([^']+)', role: '" + role + "'");
  const match = seed.match(expression);
  assert.ok(match, 'Expected seeded demo account');
  return {email:match[1],password:match[2]};
};
const lecturer = credential('lecturer');
const student = credential('student');
const port = 4800 + Math.floor(Math.random()*500);
const base = 'http://127.0.0.1:' + port;
const dataDirectory = await mkdtemp(join(tmpdir(),'spm-deployed-codepulse-http-'));
const backend=spawn(process.execPath,['server.mjs'],{
  cwd:backendDirectory,
  env:{...process.env,BACKEND_PORT:String(port),BACKEND_DATA_DIRECTORY:dataDirectory,
    CODEPULSE_AI_PROVIDER:'ollama',CODEPULSE_OLLAMA_MODEL:'qwen3:4b',
    CODEPULSE_OLLAMA_ENDPOINT:'http://127.0.0.1:11434/api/chat'},
  stdio:'ignore',
});

let lab, lecturerToken, successfulCase;
const classroom = '/api/codepulse/classrooms/class-1';
const casesPath = '/api/codepulse/issue-cases?classroomId=class-1';
const assessmentPath = '/api/codepulse/assessments?classroomId=class-1';
const findIssue = async (workspaceId) => (await request(casesPath, lecturerToken)).items.find(item => item.workspaceId === workspaceId && item.problemTypeId === 'INFINITE_RECURSION');
let step = 'health';
try {
  for (let attempt=0; ; attempt+=1) {
    try { await request('/api/health'); break; }
    catch (error) { if (attempt === 10) throw error; await delay(400); }
  }
  step = 'demo account sign-in';
  lecturerToken = (await request('/api/auth/login', null, 'POST', lecturer)).accessToken;
  const studentToken = (await request('/api/auth/login', null, 'POST', student)).accessToken;
  assert.ok(lecturerToken && studentToken);
  const { item: room } = await request(classroom, lecturerToken);
  assert.equal(room.status, 'ACTIVE');
  assert.equal(room.courseId, '13');
  assert.equal(room.name, 'CodePulse Demo', 'This workflow is scoped to the seeded demonstration classroom');
  const { items: versions } = await request(classroom+'/assignment-versions', lecturerToken);
  const version = versions.find(item => item.id === 'problem-1-v1') ?? versions.find(item => /linked list/i.test(item.title || '') && (item.runtime || item.language) === 'PYTHON');
  assert.ok(version, 'No published linked-list demo assignment available');

  step = 'prepare temporary demo lab';
  const startAt = new Date(Date.now()-60_000).toISOString();
  const endAt = new Date(Date.now()+900_000).toISOString();
  lab = (await request(classroom+'/labs', lecturerToken, 'POST', {
    name:'CodePulse AI smoke '+new Date().toISOString().replace('T',' ').slice(0,19),
    description:'Temporary demonstration of verified source evidence.',
    startAt,endAt, assignments:[{assignmentVersionId:version.id,mandatory:true,openAt:startAt,closeAt:endAt}],
  })).item;
  lab = (await request(classroom+'/labs/'+lab.id,lecturerToken,'PATCH',{status:'LIVE',expectedStateVersion:lab.stateVersion})).item;
  const {items: labs} = await request(classroom+'/labs', studentToken);
  const workspaceId = labs.find(item=>item.id===lab.id)?.assignments[0].workspaceId;
  assert.ok(workspaceId, 'No demo student workspace found');

  step = 'student save and lecturer-only access';
  const wsPath='/api/codepulse/workspaces/'+workspaceId;
  const source = 'def spm_ai_smoke_length(node):\n    return 1 + spm_ai_smoke_length(node)';
  const {item: workspace}=await request(wsPath, studentToken);
  const started=Date.now();
  await request(wsPath, studentToken, 'PATCH', {sourceCode:source,baseRevision:workspace.revision});
  for (const path of [casesPath,assessmentPath]) await request(path,studentToken,'GET',undefined,403);

  step = 'live CodePulse assessment and source evidence';
  let assessment;
  for (let attempt=0; attempt<90; attempt+=1) {
    const res=await request(assessmentPath,lecturerToken);
    assessment=res.items.find(item=>item.workspaceId===workspaceId && item.milestone==='SAVE');
    if (['EVALUATED','FAILED','INSUFFICIENT_EVIDENCE'].includes(assessment?.state)) break;
    await delay(1000);
  }
  console.log(JSON.stringify({milestone:'SAVE',state:assessment?.state,provider:assessment?.provider,model:assessment?.model,resultCode:assessment?.resultCode,elapsedSeconds:(Date.now()-started)/1000}));
  assert.equal(assessment?.state,'EVALUATED');
  assert.equal(assessment.provider,'ollama');
  assert.equal(assessment.model,'qwen3:4b');
  successfulCase=await findIssue(workspaceId);
  assert.ok(successfulCase,'Lecturer could not retrieve the infinite-recursion case');
  const evidence=successfulCase.evidence.flatMap(item=>item.references).find(ref=>ref.kind==='CODE' && ref.snapshotId===assessment.snapshotId);
  assert.ok(evidence);
  assert.equal(source.split('\n').slice(evidence.lineStart-1,evidence.lineEnd).join('\n').trim(),evidence.excerpt);
  console.log(JSON.stringify({issue:successfulCase.problemTypeId,sourceLines:[evidence.lineStart,evidence.lineEnd],studentAccess:403}));

} catch (error) {
  console.error(step+': '+(error.code ?? error.name)+' '+(error.safeMessage ?? error.message));
  process.exitCode=1;
} finally {
  try {
    if (successfulCase) await request('/api/codepulse/issue-cases/'+successfulCase.id,lecturerToken,'PATCH',{status:'DISMISSED'});
    if (lab) {
      await request(classroom+'/labs/'+lab.id,lecturerToken,'PATCH',{status:'CANCELLED',expectedStateVersion:lab.stateVersion});
      console.log('Temporary demo lab cancelled.');
    }
  } catch (error) {
    console.error('Fixture cleanup: '+(error.safeMessage ?? error.name));
    process.exitCode=1;
  }
  if (backend && backend.exitCode === null) {
    backend.kill();
    await once(backend,'exit');
  }
  if (dataDirectory) await rm(dataDirectory,{recursive:true,force:true});
}

async function request(path, token, method='GET', body, status) {
  const res=await fetch(base+path,{
    method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),
    signal:AbortSignal.timeout(12000),
  });
  if (status !== undefined && res.status === status) return;
  if (!res.ok || status !== undefined) {
    const raw=await res.json().catch(()=>({}));
    const e=new Error('Unexpected response');
    e.safeMessage=method+' '+path.replace(/\/(lab-|workspace-|issue-case-)[^/?]+/g,'/$1<fixture>')+' HTTP '+res.status+(raw.code?' '+raw.code:'');
    throw e;
  }
  return res.json();
}
