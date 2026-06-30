// ============================================================
// CHURCH MEMBERSHIP PORTAL — Code.gs  v2.2
// Modules: Login/Auth · Members · Dues · Revenue & Expense
// ============================================================

const SHEET_NAME         = "church_membership_registration";
const DUES_SHEET_NAME    = "dues_payments";
const USERS_SHEET_NAME   = "portal_users";
const FINANCE_SHEET_NAME = "revenue_expenses";

const ROLES = ["admin", "data_entry", "finance", "viewer"];

const DUES_TYPES = [
  "Tithe", "Harvest Dues", "Monthly Dues", "Welfare Dues", "Special Contribution"
];

const REVENUE_CATEGORIES = [
  "Sunday Offering", "Tithe", "Harvest Dues", "Monthly Dues",
  "Welfare Dues", "Special Contribution", "Donations & Gifts",
  "Fundraising", "Rental Income", "Other Revenue"
];

const EXPENSE_CATEGORIES = [
  "Salaries & Stipends", "Utilities (Electricity/Water)", "Building Maintenance",
  "Office Supplies", "Ministry Programs", "Outreach & Evangelism",
  "Welfare Support", "Equipment Purchase", "Transport & Logistics",
  "Printing & Stationery", "Miscellaneous Expenses"
];

const DUES_COLUMNS = [
  "receipt_no","payment_date","member_id","member_name","phone",
  "dues_type","amount","payment_method","reference",
  "period_month","period_year","recorded_by","notes"
];

const FINANCE_COLUMNS = [
  "transaction_id","transaction_date","type","category","description",
  "amount","payment_method","reference","period_month","period_year",
  "recorded_by","notes"
];

const COLUMNS = [
  "member_id","date_registered","full_name","first_name","middle_name",
  "last_name","title","gender","date_of_birth","age","marital_status",
  "nationality","country_of_origin","national_id_type","national_id_number",
  "phone_primary","community","city","occupation","society",
  "email_address","residential_address","region","country","digital_address",
  "phone_secondary","employer_name","educational_level","next_of_kin_address",
  "membership_class_attended","cell_group","ministry_interest",
  "special_needs","profile_photo","declaration_agreed","declaration_date"
];

const USER_COLUMNS = ["user_id","full_name","username","profile_photo","password_hash",
  "role","status","created_by","created_date","last_login","notes"
];

// ── ENTRY POINT ──────────────────────────────────────────────
function doGet(e) {
  return handleApiRequest(e && e.parameter ? e.parameter : {}, null);
}

function doPost(e) {
  return handleApiRequest(e.parameter, e.postData && e.postData.contents ? parseRequestBody(e) : null);
}

function parseRequestBody(e) {
  try {
    if (e.postData.type === 'application/json') {
      return JSON.parse(e.postData.contents);
    }
  } catch (error) {
    // fall through to parse form data from e.parameter
  }
  return null;
}

function handleApiRequest(params, body) {
  const action = (params && params.action) || (body && body.action);
  if (!action) {
    return jsonResponse({ status: 'ok', message: 'Apps Script backend API is running. Use action parameter.' });
  }
  try {
    const payload = Object.assign({}, params, body || {});
    const result = executeApiAction(action, payload);
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message || 'Unknown error' });
  }
}

function executeApiAction(action, payload) {
  switch (action) {
    case 'loginUser': return loginUser(payload.username, payload.password);
    case 'changePassword': return changePassword(payload.username, payload.oldPassword, payload.newPassword);
    case 'getUsers': return getUsers();
    case 'createUser': return createUser(payload, payload.createdBy);
    case 'updateUserStatus': return updateUserStatus(payload.username, payload.status);
    case 'resetUserPassword': return resetUserPassword(payload.username, payload.newPassword);
    case 'registerMember': return registerMember(payload);
    case 'searchMember': return searchMember(payload.query);
    case 'getMembers': return getMembers();
    case 'getDuesConfig': return getDuesConfig();
    case 'getMemberByQuery': return getMemberByQuery(payload.query);
    case 'recordDuesPayment': return recordDuesPayment(payload);
    case 'getMemberDuesHistory': return getMemberDuesHistory(payload.query);
    case 'getDuesSummary': return getDuesSummary();
    case 'getFinanceConfig': return getFinanceConfig();
    case 'recordTransaction': return recordTransaction(payload);
    case 'getFinanceYears': return getFinanceYears();
    case 'getCashFlowReport': return getCashFlowReport(payload.filterMonth, payload.filterYear);
    case 'testConnection': return testConnection();
    default: return { error: 'Unknown API action: ' + action };
  }
}

function jsonResponse(payload) {
  const output = ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
  if (output.setHeader) {
    output.setHeader('Access-Control-Allow-Origin', '*');
    output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  return output;
}

function doOptions(e) {
  return jsonResponse({});
}

function include(f) { return HtmlService.createHtmlOutputFromFile(f).getContent(); }

// ── SHEET HELPERS ────────────────────────────────────────────
function getSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Script must be bound to the spreadsheet.");
  return ss;
}
function getSheet() {
  const s = getSpreadsheet().getSheetByName(SHEET_NAME);
  if (!s) throw new Error('Sheet "'+SHEET_NAME+'" not found.');
  ensureSheetHeaders(s, COLUMNS, "#0f1f3d");
  return s;
}
function getDuesSheet() {
  const ss = getSpreadsheet(); let s = ss.getSheetByName(DUES_SHEET_NAME);
  if (!s) { s=ss.insertSheet(DUES_SHEET_NAME); s.appendRow(DUES_COLUMNS); styleHeader(s,DUES_COLUMNS.length,"#0f1f3d"); s.setFrozenRows(1); }
  return s;
}
function getFinanceSheet() {
  const ss = getSpreadsheet(); let s = ss.getSheetByName(FINANCE_SHEET_NAME);
  if (!s) { s=ss.insertSheet(FINANCE_SHEET_NAME); s.appendRow(FINANCE_COLUMNS); styleHeader(s,FINANCE_COLUMNS.length,"#14532d"); s.setFrozenRows(1); }
  return s;
}
function getUsersSheet() {
  const ss = getSpreadsheet(); let s = ss.getSheetByName(USERS_SHEET_NAME);
  if (!s) {
    s=ss.insertSheet(USERS_SHEET_NAME); s.appendRow(USER_COLUMNS);
    styleHeader(s,USER_COLUMNS.length,"#1a3260"); s.setFrozenRows(1);
    s.appendRow(["USR-0001","System Administrator","admin","",hashPassword("admin1234"),
                 "admin","active","system",todayStr(),"","","Default admin — change password"]);
  } else {
    ensureSheetHeaders(s, USER_COLUMNS, "#1a3260");
  }
  return s;
}
function styleHeader(sheet,n,bg) {
  const r=sheet.getRange(1,1,1,n); r.setBackground(bg); r.setFontColor("#fff"); r.setFontWeight("bold");
}
function ensureSheetHeaders(sheet, expectedCols, bg) {
  const current = sheet.getRange(1,1,1,Math.max(sheet.getLastColumn(),1)).getValues()[0].map(String);
  const missing = expectedCols.filter(c => current.indexOf(c) === -1);
  if (missing.length) {
    sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
    styleHeader(sheet, current.length + missing.length, bg);
  }
}

// ── UTILS ────────────────────────────────────────────────────
function safeVal(v) {
  if (v===null||v===undefined) return "";
  if (v instanceof Date) return isNaN(v.getTime())?"":v.toISOString().split("T")[0];
  return String(v);
}
function todayStr() { return Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyy-MM-dd"); }
function nowStr()   { return Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyy-MM-dd HH:mm"); }
function hashPassword(p) {
  const b=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,p+"_church_salt_2026");
  return b.map(x=>('0'+(x&0xff).toString(16)).slice(-2)).join('');
}
function generateUserId()      { return "USR-"+String(Math.max(getUsersSheet().getLastRow()-1,0)+1).padStart(4,"0"); }
function generateMemberId()    { return "CHU-"+new Date().getFullYear()+"-"+String(Math.max(getSheet().getLastRow()-1,0)+1).padStart(4,"0"); }
function generateReceiptNo()   { return "RCP-"+new Date().getFullYear()+"-"+String(Math.max(getDuesSheet().getLastRow()-1,0)+1).padStart(5,"0"); }
function generateTransactionId(){ return "TXN-"+new Date().getFullYear()+"-"+String(Math.max(getFinanceSheet().getLastRow()-1,0)+1).padStart(5,"0"); }
function calcAge(dob) {
  if(!dob) return ""; const b=new Date(dob); if(isNaN(b.getTime())) return "";
  const t=new Date(); let a=t.getFullYear()-b.getFullYear();
  const m=t.getMonth()-b.getMonth(); if(m<0||(m===0&&t.getDate()<b.getDate())) a--;
  return a;
}
function sheetToObjects(sheet) {
  const lr=sheet.getLastRow(); if(lr<=1) return [];
  const h=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  const d=sheet.getRange(2,1,lr-1,sheet.getLastColumn()).getValues();
  return d.filter(r=>r.some(c=>c!=="")).map(r=>{const o={};h.forEach((k,i)=>{o[String(k)]=safeVal(r[i]);});return o;});
}
function normalizeQuery(s){ return String(s||"").trim().toLowerCase().replace(/[\s\-]/g,""); }
function rowToObj(headers,row){ const o={}; headers.forEach((h,i)=>{o[String(h)]=safeVal(row[i]);}); return o; }

// ════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════
function loginUser(username,password) {
  try {
    const sheet=getUsersSheet(), users=sheetToObjects(sheet);
    const uname=String(username).trim().toLowerCase(), hash=hashPassword(String(password).trim());
    const user=users.find(u=>String(u.username).trim().toLowerCase()===uname&&String(u.password_hash).trim()===hash&&String(u.status).trim()==="active");
    if(!user) return {success:false,message:"Invalid username or password."};
    const h=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
    const d=sheet.getRange(2,1,sheet.getLastRow()-1,sheet.getLastColumn()).getValues();
    const ui=h.indexOf("username"),li=h.indexOf("last_login");
    for(let i=0;i<d.length;i++){if(String(d[i][ui]).trim().toLowerCase()===uname){sheet.getRange(i+2,li+1).setValue(nowStr());break;}}
    return {success:true,user_id:user.user_id,full_name:user.full_name,username:user.username,role:user.role};
  } catch(e){ return {success:false,message:e.message}; }
}
function changePassword(username,oldPassword,newPassword) {
  try {
    if(!newPassword||newPassword.length<6) return {success:false,message:"New password must be at least 6 characters."};
    const sheet=getUsersSheet(),h=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
    const d=sheet.getRange(2,1,sheet.getLastRow()-1,sheet.getLastColumn()).getValues();
    const ui=h.indexOf("username"),pi=h.indexOf("password_hash");
    const oh=hashPassword(String(oldPassword).trim()),nh=hashPassword(String(newPassword).trim()),un=String(username).trim().toLowerCase();
    for(let i=0;i<d.length;i++){
      if(String(d[i][ui]).trim().toLowerCase()===un){
        if(d[i][pi]!==oh) return {success:false,message:"Current password is incorrect."};
        sheet.getRange(i+2,pi+1).setValue(nh); return {success:true};
      }
    }
    return {success:false,message:"User not found."};
  } catch(e){ return {success:false,message:e.message}; }
}

// ════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ════════════════════════════════════════════════════════════
function getUsers() {
  try { return sheetToObjects(getUsersSheet()).map(u=>({user_id:u.user_id,full_name:u.full_name,username:u.username,profile_photo:u.profile_photo,role:u.role,status:u.status,created_by:u.created_by,created_date:u.created_date,last_login:u.last_login,notes:u.notes})); }
  catch(e){ return {error:e.message}; }
}
function createUser(data,createdBy) {
  try {
    if(!data.full_name||!data.username||!data.password||!data.role||!data.profile_photo) return {success:false,message:"All fields required."};
    if(data.password.length<6) return {success:false,message:"Password min 6 characters."};
    if(!ROLES.includes(data.role)) return {success:false,message:"Invalid role."};
    const sheet=getUsersSheet(),users=sheetToObjects(sheet);
    const uname=String(data.username).trim().toLowerCase();
    if(users.some(u=>String(u.username).trim().toLowerCase()===uname)) return {success:false,message:'Username "'+data.username+'" taken.'};
    const uid=generateUserId();
    sheet.appendRow([uid,String(data.full_name).trim(),uname,String(data.profile_photo).trim(),hashPassword(String(data.password).trim()),data.role,"active",createdBy||"admin",todayStr(),"",data.notes||""]);
    return {success:true,userId:uid};
  } catch(e){ return {success:false,message:e.message}; }
}
function updateUserStatus(username,status) {
  try {
    const sheet=getUsersSheet(),h=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
    const rows=sheet.getRange(2,1,sheet.getLastRow()-1,sheet.getLastColumn()).getValues();
    const ui=h.indexOf("username"),si=h.indexOf("status"),un=String(username).trim().toLowerCase();
    for(let i=0;i<rows.length;i++){
      if(String(rows[i][ui]).trim().toLowerCase()===un){
        if(status==="inactive"&&rows[i][h.indexOf("role")]==="admin"){
          const aa=rows.filter(r=>r[h.indexOf("role")]==="admin"&&r[h.indexOf("status")]==="active");
          if(aa.length<=1) return {success:false,message:"Cannot deactivate only active admin."};
        }
        sheet.getRange(i+2,si+1).setValue(status); return {success:true};
      }
    }
    return {success:false,message:"User not found."};
  } catch(e){ return {success:false,message:e.message}; }
}
function resetUserPassword(username,newPassword) {
  try {
    if(!newPassword||newPassword.length<6) return {success:false,message:"Password min 6 characters."};
    const sheet=getUsersSheet(),h=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
    const rows=sheet.getRange(2,1,sheet.getLastRow()-1,sheet.getLastColumn()).getValues();
    const ui=h.indexOf("username"),pi=h.indexOf("password_hash"),un=String(username).trim().toLowerCase();
    for(let i=0;i<rows.length;i++){
      if(String(rows[i][ui]).trim().toLowerCase()===un){sheet.getRange(i+2,pi+1).setValue(hashPassword(String(newPassword).trim()));return {success:true};}
    }
    return {success:false,message:"User not found."};
  } catch(e){ return {success:false,message:e.message}; }
}

// ════════════════════════════════════════════════════════════
// MEMBERSHIP
// ════════════════════════════════════════════════════════════
function registerMember(data) {
  try {
    const req=["first_name","last_name","gender","date_of_birth","marital_status","nationality","phone_primary","national_id_type","national_id_number","society","profile_photo"];
    for(const f of req) if(!data[f]||!String(data[f]).trim()) return {success:false,message:"Missing: "+f};
    const sheet=getSheet(), existing=sheetToObjects(sheet);
    const np=normalizeQuery(data.phone_primary), ni=normalizeQuery(data.national_id_number);
    for(const m of existing){
      if(np&&normalizeQuery(m.phone_primary)===np) return {success:false,message:"Phone "+data.phone_primary+" already registered ("+m.member_id+" — "+m.full_name+")."};
      if(ni&&normalizeQuery(m.national_id_number)===ni) return {success:false,message:"ID "+data.national_id_number+" already registered ("+m.member_id+" — "+m.full_name+")."};
    }
    const mid=generateMemberId(), fullName=[data.title,data.first_name,data.middle_name,data.last_name].filter(Boolean).join(" ").trim();
    const today=todayStr();
    sheet.appendRow(COLUMNS.map(col=>{
      if(col==="member_id") return mid; if(col==="date_registered") return today;
      if(col==="full_name") return fullName; if(col==="age") return calcAge(data.date_of_birth);
      if(col==="declaration_date") return today; return data[col]!=null?String(data[col]):"";
    }));
    return {success:true,memberId:mid};
  } catch(e){ return {success:false,message:e.message}; }
}
function getMembers() { try { return sheetToObjects(getSheet()); } catch(e){ return {error:e.message}; } }
function searchMember(query) {
  try {
    const sheet=getSheet(),lr=sheet.getLastRow(); if(lr<=1) return null;
    const h=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
    const d=sheet.getRange(2,1,lr-1,sheet.getLastColumn()).getValues();
    const ci={}; h.forEach((k,i)=>{ci[String(k).trim()]=i;});
    const pi=ci["phone_primary"]??15,p2i=ci["phone_secondary"]??25,ii=ci["national_id_number"]??14,mi=ci["member_id"]??0;
    const q=normalizeQuery(query); if(!q) return null;
    for(const r of d){if(r.every(c=>c===""))continue;if(normalizeQuery(r[pi])===q||normalizeQuery(r[p2i])===q)return rowToObj(h,r);}
    for(const r of d){if(r.every(c=>c===""))continue;if(normalizeQuery(r[ii])===q)return rowToObj(h,r);}
    for(const r of d){if(r.every(c=>c===""))continue;if(normalizeQuery(r[mi])===q)return rowToObj(h,r);}
    return null;
  } catch(e){ return {error:e.message}; }
}

// ════════════════════════════════════════════════════════════
// DUES
// ════════════════════════════════════════════════════════════
function getDuesConfig() {
  const months=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const now=new Date(); return {duesTypes:DUES_TYPES,months,currentMonth:months[now.getMonth()],currentYear:now.getFullYear()};
}
function getMemberByQuery(query) {
  try {
    const sheet=getSheet(),lr=sheet.getLastRow(); if(lr<=1) return null;
    const h=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
    const d=sheet.getRange(2,1,lr-1,sheet.getLastColumn()).getValues();
    const ci={}; h.forEach((k,i)=>{ci[String(k).trim()]=i;});
    const pi=ci["phone_primary"]??15,p2i=ci["phone_secondary"]??25,ii=ci["national_id_number"]??14,mi=ci["member_id"]??0;
    const q=normalizeQuery(query); if(!q) return null;
    for(const r of d){if(r.every(c=>c===""))continue;if(normalizeQuery(r[pi])===q||normalizeQuery(r[p2i])===q)return rowToObj(h,r);}
    for(const r of d){if(r.every(c=>c===""))continue;if(normalizeQuery(r[ii])===q)return rowToObj(h,r);}
    for(const r of d){if(r.every(c=>c===""))continue;if(normalizeQuery(r[mi])===q)return rowToObj(h,r);}
    return null;
  } catch(e){ return {error:e.message}; }
}
function getMemberById(q){ return getMemberByQuery(q); }
function recordDuesPayment(data) {
  try {
    if(!data.member_id) return {success:false,message:"Member ID required."};
    if(!data.dues_type) return {success:false,message:"Select dues type."};
    if(!data.amount||isNaN(parseFloat(data.amount))||parseFloat(data.amount)<=0) return {success:false,message:"Valid amount required."};
    if(!data.payment_method) return {success:false,message:"Select payment method."};
    if(!data.period_month) return {success:false,message:"Select period month."};
    if(!data.period_year) return {success:false,message:"Enter period year."};
    const member=getMemberByQuery(data.member_id);
    if(!member) return {success:false,message:'Member "'+data.member_id+'" not found.'};
    if(member.error) return {success:false,message:member.error};
    const sheet=getDuesSheet(),rno=generateReceiptNo(),today=todayStr();
    const row=DUES_COLUMNS.map(col=>{
      if(col==="receipt_no") return rno; if(col==="payment_date") return data.payment_date||today;
      if(col==="member_id") return member.member_id; if(col==="member_name") return member.full_name||[member.first_name,member.last_name].filter(Boolean).join(" ");
      if(col==="phone") return member.phone_primary||""; if(col==="amount") return parseFloat(data.amount);
      return data[col]!==undefined?String(data[col]):"";
    });
    sheet.appendRow(row);
    return {success:true,receiptNo:rno,memberName:row[3],memberId:member.member_id,duesType:data.dues_type,amount:parseFloat(data.amount),paymentMethod:data.payment_method,periodMonth:data.period_month,periodYear:data.period_year,paymentDate:data.payment_date||today,reference:data.reference||""};
  } catch(e){ return {success:false,message:e.message}; }
}
function getMemberDuesHistory(query) {
  try {
    const member=getMemberByQuery(query); if(!member||member.error) return [];
    const sheet=getDuesSheet(),lr=sheet.getLastRow(); if(lr<=1) return [];
    const h=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
    const d=sheet.getRange(2,1,lr-1,sheet.getLastColumn()).getValues();
    const mi=h.indexOf("member_id"),mid=member.member_id.toLowerCase();
    return d.filter(r=>String(r[mi]).trim().toLowerCase()===mid).map(r=>{const o={};h.forEach((k,i)=>{o[String(k)]=safeVal(r[i]);});return o;}).reverse();
  } catch(e){ return {error:e.message}; }
}
function getDuesSummary() {
  try {
    const sheet=getDuesSheet(),lr=sheet.getLastRow();
    if(lr<=1) return {byType:{},byMonth:{},grandTotal:0,totalRecords:0};
    const h=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
    const d=sheet.getRange(2,1,lr-1,sheet.getLastColumn()).getValues();
    const ci={}; h.forEach((k,i)=>{ci[String(k).trim()]=i;});
    const ti=ci["dues_type"]??5,ai=ci["amount"]??6,moi=ci["period_month"]??9,yi=ci["period_year"]??10;
    const byType={},byMonth={}; let gt=0;
    for(const r of d){
      if(r.every(c=>c===""))continue;
      const t=String(r[ti]||"Unknown"),a=parseFloat(r[ai])||0,p=String(r[moi]||"")+" "+String(r[yi]||"");
      byType[t]=(byType[t]||0)+a; byMonth[p]=(byMonth[p]||0)+a; gt+=a;
    }
    const mo=["January","February","March","April","May","June","July","August","September","October","November","December"];
    const sbm=Object.fromEntries(Object.entries(byMonth).sort(([a],[b])=>{const[am,ay]=a.split(" "),[bm,by]=b.split(" ");return ay!==by?parseInt(ay||0)-parseInt(by||0):mo.indexOf(am)-mo.indexOf(bm);}));
    return {byType,byMonth:sbm,grandTotal:gt,totalRecords:d.filter(r=>r.some(c=>c!=="")).length};
  } catch(e){ return {error:e.message}; }
}

// ════════════════════════════════════════════════════════════
// REVENUE & EXPENSE
// ════════════════════════════════════════════════════════════
function getFinanceConfig() {
  const months=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const now=new Date();
  return {revenueCategories:REVENUE_CATEGORIES,expenseCategories:EXPENSE_CATEGORIES,months,currentMonth:months[now.getMonth()],currentYear:now.getFullYear()};
}

function recordTransaction(data) {
  try {
    if(!data.type||!["Revenue","Expense"].includes(data.type)) return {success:false,message:"Type must be Revenue or Expense."};
    if(!data.category)    return {success:false,message:"Select a category."};
    if(!data.description||!String(data.description).trim()) return {success:false,message:"Enter a description."};
    if(!data.amount||isNaN(parseFloat(data.amount))||parseFloat(data.amount)<=0) return {success:false,message:"Enter a valid amount."};
    if(!data.payment_method) return {success:false,message:"Select payment method."};
    if(!data.period_month)   return {success:false,message:"Select period month."};
    if(!data.period_year)    return {success:false,message:"Enter period year."};
    const sheet=getFinanceSheet(),txnId=generateTransactionId(),today=todayStr();
    const row=FINANCE_COLUMNS.map(col=>{
      if(col==="transaction_id")   return txnId;
      if(col==="transaction_date") return data.transaction_date||today;
      if(col==="amount")           return parseFloat(data.amount);
      return data[col]!==undefined?String(data[col]):"";
    });
    sheet.appendRow(row);
    return {success:true,transactionId:txnId,type:data.type,category:data.category,description:data.description,amount:parseFloat(data.amount),paymentMethod:data.payment_method,periodMonth:data.period_month,periodYear:data.period_year,transactionDate:data.transaction_date||today,reference:data.reference||""};
  } catch(e){ return {success:false,message:e.message}; }
}

function getCashFlowReport(filterMonth,filterYear) {
  try {
    const sheet=getFinanceSheet(),lr=sheet.getLastRow();
    if(lr<=1) return {rows:[],summary:{totalRevenue:0,totalExpense:0,netFlow:0},byCategory:{revenue:{},expense:{}}};
    const h=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
    const d=sheet.getRange(2,1,lr-1,sheet.getLastColumn()).getValues();
    const ci={}; h.forEach((k,i)=>{ci[String(k).trim()]=i;});
    const typeIdx=ci["type"]??2,catIdx=ci["category"]??3,descIdx=ci["description"]??4;
    const amtIdx=ci["amount"]??5,methodIdx=ci["payment_method"]??6,refIdx=ci["reference"]??7;
    const monthIdx=ci["period_month"]??8,yearIdx=ci["period_year"]??9;
    const byIdx=ci["recorded_by"]??10,notesIdx=ci["notes"]??11;
    const dateIdx=ci["transaction_date"]??1,idIdx=ci["transaction_id"]??0;
    const fm=String(filterMonth||"").trim().toLowerCase();
    const fy=String(filterYear||"").trim();
    let totalRevenue=0,totalExpense=0;
    const byCatRev={},byCatExp={},rows=[];
    for(const row of d){
      if(row.every(c=>c===""))continue;
      if(fm&&String(row[monthIdx]||"").trim().toLowerCase()!==fm) continue;
      if(fy&&String(row[yearIdx]||"").trim()!==fy) continue;
      const type=String(row[typeIdx]||"").trim(),cat=String(row[catIdx]||"Unknown"),amt=parseFloat(row[amtIdx])||0;
      if(type==="Revenue"){totalRevenue+=amt;byCatRev[cat]=(byCatRev[cat]||0)+amt;}
      else if(type==="Expense"){totalExpense+=amt;byCatExp[cat]=(byCatExp[cat]||0)+amt;}
      rows.push({transaction_id:safeVal(row[idIdx]),transaction_date:safeVal(row[dateIdx]),type,category:cat,description:safeVal(row[descIdx]),amount:amt,payment_method:safeVal(row[methodIdx]),reference:safeVal(row[refIdx]),period_month:safeVal(row[monthIdx]),period_year:safeVal(row[yearIdx]),recorded_by:safeVal(row[byIdx]),notes:safeVal(row[notesIdx])});
    }
    rows.sort((a,b)=>b.transaction_date.localeCompare(a.transaction_date));
    return {rows,summary:{totalRevenue,totalExpense,netFlow:totalRevenue-totalExpense},byCategory:{revenue:byCatRev,expense:byCatExp},filterMonth:filterMonth||"All",filterYear:filterYear||"All"};
  } catch(e){ return {error:e.message}; }
}

function getFinanceYears() {
  try {
    const sheet=getFinanceSheet(),lr=sheet.getLastRow();
    const years=new Set([new Date().getFullYear()]);
    if(lr>1){
      const h=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
      const d=sheet.getRange(2,1,lr-1,sheet.getLastColumn()).getValues();
      const ci={}; h.forEach((k,i)=>{ci[String(k).trim()]=i;});
      const yi=ci["period_year"]??9;
      for(const r of d){const y=parseInt(r[yi]);if(!isNaN(y))years.add(y);}
    }
    return Array.from(years).sort((a,b)=>b-a);
  } catch(e){ return [new Date().getFullYear()]; }
}

function testConnection() {
  const sheets = [
    getSheet().getName(),
    getDuesSheet().getName(),
    getFinanceSheet().getName(),
    getUsersSheet().getName()
  ];
  Logger.log("Sheets reachable: " + sheets.join(", "));
  return { success: true, message: 'Apps Script backend is reachable.', sheets };
}