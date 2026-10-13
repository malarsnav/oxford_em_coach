const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const migration=fs.readFileSync(path.join(__dirname,'../supabase/migrations/009_student_workspace.sql'),'utf8');
const a='00000000-0000-0000-0000-000000000001',b='00000000-0000-0000-0000-000000000002';
(async()=>{
 const db=new PGlite();
 try{
 await db.exec(`
 create role anon; create role authenticated;
 create schema auth;
 create table auth.users(id uuid primary key);
 insert into auth.users values ('${a}'),('${b}');
 create function auth.uid() returns uuid language sql as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
 grant usage on schema public,auth to authenticated;
 create table public.user_profiles(user_id uuid,parent_email text,parent_digest_enabled boolean,parent_digest_time time,parent_digest_timezone text,parent_digest_include_no_activity boolean);
 insert into public.user_profiles(user_id,parent_email,parent_digest_enabled) values ('${a}','parent@example.test',true);
 alter table public.user_profiles enable row level security;
 create policy own_profiles on public.user_profiles for select to authenticated using(auth.uid()=user_id);
 create table public.student_parent_links(student_user_id uuid,parent_user_id uuid,status text);
 insert into public.student_parent_links values ('${a}','${b}','active');
 alter table public.student_parent_links enable row level security;
 create policy "student parent links visible to participants" on public.student_parent_links for select to authenticated using(true);
 create policy "parents read linked student profiles" on public.user_profiles for select to authenticated using(exists(select 1 from public.student_parent_links where student_user_id=user_profiles.user_id and parent_user_id=auth.uid() and status='active'));
 create function public.claim_parent_links() returns integer language sql as 'select 0';
 create table public.study_plan_logs(user_id uuid,log_date date);
 grant select on public.user_profiles,public.student_parent_links,public.study_plan_logs to authenticated;
 `);
 await db.exec(migration);
 await db.exec(migration);
 assert.equal((await db.query("select count(*)::integer n from pg_policies where policyname like 'parents read linked student%'")).rows[0].n,0);
 assert.equal((await db.query("select count(*)::integer n from information_schema.columns where table_name='user_profiles' and column_name='parent_email'")).rows[0].n,0);
 const date=(await db.query("select ((now() at time zone 'Europe/London')::date+10)::text d")).rows[0].d;
 const block={day:'Tuesday',from:'09:00',to:'10:00',activity:'Maths'};
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${a}';`);
 await db.query('insert into public.study_plan_versions(user_id,effective_from,blocks) values($1,$2,$3)',[a,date,JSON.stringify([block])]);
 await db.query('insert into public.study_block_tasks(user_id,block_date,start_time,end_time,activity,title) values($1,$2,$3,$4,$5,$6)',[a,date,'09:00','10:00','Maths','Revise']);
 await assert.rejects(db.query('insert into public.study_plan_versions(user_id,effective_from,single_day,blocks) values($1,$2,true,$3)',[a,date,JSON.stringify([{...block,from:'25:00'}])]),/Invalid timetable/);
 await assert.rejects(db.query('insert into public.study_plan_versions(user_id,effective_from,single_day,blocks) values($1,$2,true,$3)',[a,date,JSON.stringify([block,{...block,from:'09:30',to:'10:30'}])]),/overlap/);
 await db.exec(`set request.jwt.claim.sub='${b}';`);
 for(const table of ['study_plan_versions','study_block_tasks','user_profiles'])assert.equal((await db.query('select count(*)::integer n from public.'+table)).rows[0].n,0);
 await assert.rejects(db.query('insert into public.study_block_tasks(user_id,block_date,start_time,end_time,activity,title) values($1,$2,$3,$4,$5,$6)',[a,date,'09:00','10:00','Maths','Not mine']),/row-level security/);
 assert.equal((await db.query("update public.study_block_tasks set title='Changed' returning id")).rows.length,0);
 await assert.rejects(db.query('select * from public.student_parent_links'),/permission denied/);
 console.log('PASS migration 009: PostgreSQL execution, rerun, valid plan/task inserts, invalid times, overlap rejection, cross-user RLS and revoked parent access');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
