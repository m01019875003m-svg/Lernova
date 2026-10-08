window.LernovaAuth={
  client:null,
  init(){
    if(this.client)return this.client;
    const cfg=window.LERNOVA_CONFIG;
    const key=cfg?.SUPABASE_PUBLISHABLE_KEY||cfg?.SUPABASE_ANON_KEY;
    if(!window.supabase||!cfg||!/^https:\/\/.+\.supabase\.co$/.test(cfg.SUPABASE_URL||'')||!key||key.includes('YOUR_'))return null;
    try{this.client=window.supabase.createClient(cfg.SUPABASE_URL,key);return this.client}catch(error){console.error('Lernova auth init failed',error);return null}
  },
  async session(){return this.client?.auth.getSession()},
  async signUp(email,password,username){if(!this.client)throw new Error('Supabase يحتاج الإعداد أولًا.');return this.client.auth.signUp({email,password,options:{data:{username}}})},
  async signIn(email,password){if(!this.client)throw new Error('Supabase يحتاج الإعداد أولًا.');return this.client.auth.signInWithPassword({email,password})},
  async signOut(){if(!this.client)return {error:new Error('Supabase يحتاج الإعداد أولًا.')};return this.client.auth.signOut()}
};
