/* Shared account chip for every Lernova page. */
(() => {
  const pathPrefix = /\/pages\//.test(location.pathname) ? '../' : './';
  const profileHref = `${pathPrefix}pages/profile.html`;
  const loginHref = `${pathPrefix}pages/login.html`;
  const cached = (() => { try { return JSON.parse(localStorage.getItem('lernovaProfile') || '{}'); } catch { return {}; } })();

  function mount() {
    const nav = document.querySelector('.nav, body > nav');
    if (!nav || nav.querySelector('.header-profile')) return;
    nav.classList.add('nav');
    let actions = nav.querySelector('.nav-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'nav-actions';
      const brand = nav.querySelector('.brand');
      [...nav.children].forEach(child => { if (child !== brand) actions.appendChild(child); });
      nav.appendChild(actions);
    }
    actions.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href') || '';
      if (/pages\/(login|profile)\.html|(^|\/)login\.html|(^|\/)profile\.html/.test(href)) link.remove();
    });

    const link = document.createElement('a');
    link.className = 'header-profile';
    link.innerHTML = '<span class="header-avatar"><img alt="" hidden><span aria-hidden="true">👤</span></span><span class="header-profile-copy"><strong></strong><small></small></span>';
    actions.appendChild(link);
    const img = link.querySelector('img'), fallback = link.querySelector('.header-avatar span'), name = link.querySelector('strong'), hint = link.querySelector('small');

    function paint(profile = {}, signedIn = false) {
      const username = (profile.username || '').trim();
      const avatar = profile.avatar_url || '';
      link.href = signedIn ? profileHref : loginHref;
      link.classList.toggle('is-guest', !signedIn);
      name.textContent = signedIn ? (username || 'حسابي') : 'تسجيل الدخول';
      hint.textContent = signedIn ? 'ملفك الشخصي' : 'لمزامنة تقدمك';
      if (avatar) {
        img.src = avatar; img.hidden = false; fallback.hidden = true;
        img.onerror = () => { img.hidden = true; fallback.hidden = false; };
      } else { img.removeAttribute('src'); img.hidden = true; fallback.hidden = false; }
    }

    paint(cached, !!cached.username);
    const auth = window.LernovaAuth;
    const client = auth?.client || auth?.init?.();
    if (!client) { paint({}, false); return; }
    const refresh = async session => {
      const user = session?.user;
      if (!user) { localStorage.removeItem('lernovaProfile'); paint({}, false); return; }
      let record = { username: user.user_metadata?.username || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '', avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '' };
      try {
        const { data } = await client.from('profiles').select('username,avatar_url').eq('id', user.id).maybeSingle();
        if (data) record = { username: data.username || record.username, avatar_url: data.avatar_url ?? record.avatar_url };
      } catch (error) { console.info('Profile details are not available yet:', error.message); }
      localStorage.setItem('lernovaProfile', JSON.stringify(record));
      paint(record, true);
    };
    client.auth.getSession().then(({ data }) => refresh(data?.session)).catch(() => paint({}, false));
    client.auth.onAuthStateChange((_event, session) => { setTimeout(() => refresh(session), 0); });
    window.addEventListener('lernova:profile-updated', event => {
      const record = event.detail || {};
      localStorage.setItem('lernovaProfile', JSON.stringify(record));
      paint(record, true);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();



/* Consistent dimensional icons; labels remain selectable and translatable. */
(()=>{
 const base=/\/pages\//.test(location.pathname)?'../':'./';
 const icons={lessons:'words',chapters:'words',words:'words',review:'review',quiz:'quiz',exam:'exam',progress:'progress',listening:'listening',speaking:'speaking',profile:'profile',mistakes:'mistakes',today:'today',grammar:'grammar',support:'support','support-inbox':'support'};
 const strip=t=>t.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u,'');
 const image=(name,cls='')=>{const img=document.createElement('img');img.className='learning-icon '+cls;img.src=base+'assets/ui-'+name+'-v2.svg';img.alt='';img.setAttribute('aria-hidden','true');img.width=64;img.height=64;return img;};
 function mount(){
  document.querySelectorAll('a.card[href]').forEach(card=>{const key=(card.getAttribute('href').match(/([^/]+)\.html/)||[])[1],name=icons[key];if(!name||card.querySelector('.learning-icon'))return;const heading=card.querySelector('h3');if(heading){heading.textContent=strip(heading.textContent);card.insertBefore(image(name),heading);}});
  const key=(location.pathname.match(/([^/]+)\.html/)||[])[1],heading=document.querySelector('main h1');if(icons[key]&&heading&&!heading.querySelector('.learning-icon'))heading.prepend(image(icons[key],'page-learning-icon'));
  document.querySelectorAll('.brand').forEach(brand=>{if(brand.querySelector('.brand-mark'))return;const img=document.createElement('img');img.className='brand-mark';img.src=base+'assets/lernova-launcher-v2-192.png';img.alt='';img.setAttribute('aria-hidden','true');brand.prepend(img);});
  const fallback=document.querySelector('.header-avatar span');if(fallback){fallback.textContent='';const img=image('profile');img.className='account-symbol';fallback.append(img);}
  const link=document.createElement('link');link.rel='icon';link.type='image/png';link.href=base+'assets/lernova-launcher-v2-192.png';document.head.append(link);
  const touch=link.cloneNode();touch.rel='apple-touch-icon';document.head.append(touch);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
