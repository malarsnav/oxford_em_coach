import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { loggingEvidence, londonClock, reminderDue, studentReminderText } from '../../../src/preparationSignals.js';

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});

Deno.serve(async(request)=>{
  if(request.method!=='POST')return json({error:'POST required'},405);
  const secret=Deno.env.get('STUDENT_REMINDER_CRON_SECRET');
  if(!secret)return json({error:'Reminder service not configured'},503);
  if(request.headers.get('x-cron-secret')!==secret)return json({error:'Unauthorized'},401);
  const apiKey=Deno.env.get('BREVO_API_KEY'), sender=Deno.env.get('REMINDER_FROM_EMAIL');
  if(!apiKey || !sender)return json({error:'Email sender not configured'},503);
  const now=new Date();
  if(!reminderDue(now))return json({status:'outside_delivery_window'});
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const date=londonClock(now).date;
  try {
    const {data:preferences,error}=await db.from('student_reminder_preferences').select('user_id').eq('enabled',true);
    if(error)throw error;
    let sent=0,skipped=0,failed=0;
    for(const preference of preferences || []) {
      const userId=preference.user_id;
      const {data:logs,error:logError}=await db.from('study_plan_logs').select('log_date,start_time,end_time,planned_activity,details').eq('user_id',userId).eq('log_date',date);
      if(logError){failed++;continue;} // Missing database data must never be treated as missing study.
      const evidence=loggingEvidence(logs || [],now,1);
      if(!evidence.todayMissing){skipped++;continue;}
      const {data:auth,error:authError}=await db.auth.admin.getUserById(userId);
      if(authError || !auth.user?.email || !auth.user.email_confirmed_at){failed++;continue;}
      const {error:claimError}=await db.from('student_reminder_deliveries').insert({user_id:userId,local_date:date,status:'pending'});
      if(claimError){if(claimError.code==='23505')skipped++;else failed++;continue;}
      let status='failed';
      try {
        const {data:current,error:preferenceError}=await db.from('student_reminder_preferences').select('enabled').eq('user_id',userId).single();
        if(preferenceError)throw preferenceError;
        if(!current.enabled){status='cancelled';skipped++;}
        else {
          const response=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',signal:AbortSignal.timeout(15000),headers:{'api-key':apiKey,'Content-Type':'application/json'},body:JSON.stringify({sender:{name:'Oxford PPE Coach',email:sender},to:[{email:auth.user.email}],subject:`Your study log check-in - ${date}`,textContent:studentReminderText(evidence)})});
          if(!response.ok)throw new Error('Email provider rejected send');
          status='sent';sent++;
        }
      } catch {failed++;}
      const {error:updateError}=await db.from('student_reminder_deliveries').update({status,updated_at:new Date().toISOString()}).eq('user_id',userId).eq('local_date',date);
      if(updateError)failed++;
    }
    return json({date,sent,skipped,failed});
  } catch {return json({error:'Reminder processing failed; no missing-data inference made'},500);}
});
