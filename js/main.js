/* SmartBus – front-end demo (no backend). All data in localStorage). */

// ---------- helpers ----------
const $ = (q, root=document) => root.querySelector(q);
const $$ = (q, root=document) => [...root.querySelectorAll(q)];
const store = {
  get: (k, d=null) => {
    try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; }
  },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: (k) => localStorage.removeItem(k)
};
const uid = (p='id_') => p + Math.random().toString(36).slice(2,9);
const fmtINR = (n) => new Intl.NumberFormat('en-IN').format(n);

// Bootstrap demo data on first load
(function seed(){
  if (!store.get('seeded')) {
    const buses = [
      { id:'B1001', name:'SmartBus AC Sleeper', type:'AC Sleeper', operator:'Smart Travels',
        from:'Hyderabad', to:'Bengaluru', dep:'22:00', arr:'07:00', duration:'9h', fare:1200, seats:34 },
      { id:'B1033', name:'SmartBus Seater', type:'AC Seater', operator:'Smart Travels',
        from:'Hyderabad', to:'Bengaluru', dep:'23:00', arr:'06:30', duration:'7h 30m', fare:999, seats:40 },
      { id:'B2204', name:'Velocity AC', type:'AC Seater', operator:'Velocity',
        from:'Hyderabad', to:'Chennai', dep:'21:15', arr:'06:45', duration:'9h 30m', fare:1100, seats:45 },
    ];
    const bookings = [];
    const users = [{ id:'U1', name:'Demo User', email:'demo@smartbus.app', password:'demodem' }];
    store.set('buses', buses);
    store.set('bookings', bookings);
    store.set('users', users);
    store.set('seeded', true);
  }
})();

// ---------- auth ----------
function currentUser(){
  return store.get('sessionUser', null);
}
function requireAuth(redirect='login.html'){
  if (!currentUser()) location.href = redirect;
}
function syncNav(){
  const u = currentUser();
  const navLogin = $('#nav-login');
  const navDash = $('#nav-dashboard');
  if (navLogin && navDash) {
    if (u){ navLogin.classList.add('hide'); navDash.classList.remove('hide'); }
    else { navLogin.classList.remove('hide'); navDash.classList.add('hide'); }
  }
}
syncNav();

// ---------- index header year ----------
const yearEl = $('#year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ---------- register ----------
const registerForm = $('#registerForm');
if (registerForm){
  registerForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(registerForm);
    const name = fd.get('name').trim();
    const email = fd.get('email').trim().toLowerCase();
    const password = fd.get('password');
    const users = store.get('users', []);
    if (users.find(u=>u.email===email)) { alert('Email already registered.'); return; }
    const u = { id: uid('U'), name, email, password };
    users.push(u);
    store.set('users', users);
    store.set('sessionUser', { id: u.id, name: u.name, email: u.email });
    location.href = 'dashboard.html';
  });
}

// ---------- login ----------
const loginForm = $('#loginForm');
if (loginForm){
  loginForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(loginForm);
    const email = fd.get('email').trim().toLowerCase();
    const password = fd.get('password');
    const users = store.get('users', []);
    const u = users.find(x=>x.email===email && x.password===password);
    if (!u){ alert('Invalid credentials'); return; }
    store.set('sessionUser', { id: u.id, name: u.name, email: u.email });
    location.href = 'dashboard.html';
  });
}

// ---------- logout button (dashboard) ----------
const logoutBtn = $('#logoutBtn');
if (logoutBtn){
  logoutBtn.addEventListener('click', ()=>{
    store.del('sessionUser');
    location.href = 'index.html';
  });
}

// ---------- dashboard ----------
if (location.pathname.endsWith('dashboard.html')){
  requireAuth();
  const u = currentUser();
  $('#userName').textContent = u?.name ?? 'User';

  // Show upcoming trips
  const all = (store.get('bookings', [])).filter(b=>b.userId===u.id);
  const upcoming = all.filter(b=> new Date(b.journeyDate) >= new Date(new Date().toDateString()));
  const el = $('#upcomingList');
  if (!upcoming.length){
    el.innerHTML = `<p class="muted">No upcoming trips. <a href="search.html">Book now</a>.</p>`;
  } else {
    el.innerHTML = upcoming.map(b => `
      <div class="card">
        <strong>${b.bus.name}</strong> • ${b.bus.from} → ${b.bus.to}
        <div class="muted">${b.bus.dep} → ${b.bus.arr} • ${b.bus.duration} • ${b.journeyDate}</div>
        <div>Seats: ${b.seats.join(', ')} • Fare: ₹${fmtINR(b.total)}</div>
        <div class="actions">
          <a class="btn" href="confirmation.html?bid=${b.id}">View Ticket</a>
          <a class="btn" href="track.html?bid=${b.id}">Track</a>
        </div>
      </div>
    `).join('');
  }
}

// ---------- search ----------
const searchForm = $('#searchForm');
if (searchForm){
  // prefill today
  const dateInput = searchForm.querySelector('input[name="date"]');
  const today = new Date(); today.setHours(0,0,0,0);
  dateInput.valueAsDate = today;

  searchForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(searchForm);
    const q = new URLSearchParams({
      from: fd.get('from').trim(),
      to: fd.get('to').trim(),
      date: fd.get('date')
    });
    location.href = `results.html?${q.toString()}`;
  });
}

// ---------- results ----------
if (location.pathname.endsWith('results.html')){
  const params = new URLSearchParams(location.search);
  const from = params.get('from'), to = params.get('to'), date = params.get('date');
  $('#searchSummary').textContent = `${from} → ${to} on ${date}`;
  const buses = store.get('buses', []).filter(b => 
    b.from.toLowerCase()===from.toLowerCase() && b.to.toLowerCase()===to.toLowerCase()
  );
  const wrap = $('#resultsList');
  if (!buses.length){ wrap.innerHTML = `<p class="muted">No buses found. Try another route/date.</p>`; }
  else {
    wrap.innerHTML = buses.map(b => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div>
            <strong>${b.name}</strong> <span class="muted">(${b.type})</span><br/>
            <span class="muted">${b.operator}</span>
            <div class="muted">${b.dep} → ${b.arr} • ${b.duration}</div>
          </div>
          <div style="text-align:right">
            <div class="muted">From</div>
            <div style="font-size:20px;font-weight:700">₹${fmtINR(b.fare)}</div>
            <button class="btn primary" data-bus="${b.id}">Select Seats</button>
          </div>
        </div>
      </div>
    `).join('');
    wrap.addEventListener('click', (e)=>{
      const btn = e.target.closest('button[data-bus]');
      if (!btn) return;
      const q = new URLSearchParams({ busId: btn.dataset.bus, date });
      location.href = `seat-selection.html?${q.toString()}`;
    });
  }
}

// ---------- seat selection ----------
if (location.pathname.endsWith('seat-selection.html')){
  const params = new URLSearchParams(location.search);
  const busId = params.get('busId');
  const date = params.get('date');
  const bus = store.get('buses', []).find(b=>b.id===busId);
  if (!bus){ location.href='results.html'; }
  $('#busTitle').textContent = `${bus.name} • ₹${fmtINR(bus.fare)}`;
  $('#busMeta').textContent = `${bus.from} → ${bus.to} • ${date} • ${bus.dep} → ${bus.arr}`;

  // Create a 2x? sleeper-ish grid = 4 columns; mark some random booked/female seats
  const total = bus.seats;
  const grid = $('#seatGrid');
  const bookedSet = new Set(store.get('bookings', [])
    .filter(b=>b.bus.id===bus.id && b.journeyDate===date)
    .flatMap(b=>b.seats));

  // Reserve first 2 columns in each row as female-only
  const cols = 4; // total seat columns in the grid
  const femaleSet = new Set(
    [...Array(total).keys()]
      .map(i => i + 1) // seat numbers
      .filter(seatNum => {
        const colIndex = (seatNum - 1) % cols; // 0-based column index
        return colIndex < 2; // first two columns
      })
  );


  const selected = new Set();
  for (let n=1; n<=total; n++){
    const div = document.createElement('div');
    div.className = 'seat';
    div.textContent = n;
    if (bookedSet.has(n)) div.classList.add('booked');
    if (femaleSet.has(n)) div.classList.add('female');
    div.dataset.n = n;
    grid.appendChild(div);
  }

  function refreshSummary(){
    $('#selectedSeats').textContent = selected.size;
    $('#fareTotal').textContent = fmtINR(selected.size * bus.fare);
    $('#proceedPassenger').disabled = selected.size === 0;
  }
  refreshSummary();

  grid.addEventListener('click', (e)=>{
    const seat = e.target.closest('.seat');
    if (!seat || seat.classList.contains('booked')) return;
    const n = Number(seat.dataset.n);
    if (selected.has(n)) { selected.delete(n); seat.classList.remove('selected'); }
    else { selected.add(n); seat.classList.add('selected'); }
    refreshSummary();
  });

  $('#proceedPassenger').addEventListener('click', ()=>{
    const q = new URLSearchParams({ busId: bus.id, date, seats:[...selected].join(',') });
    location.href = `passenger-details.html?${q.toString()}`;
  });
}

// ---------- passenger details ----------
if (location.pathname.endsWith('passenger-details.html')){
  const params = new URLSearchParams(location.search);
  const busId = params.get('busId'); const date = params.get('date');
  const seats = (params.get('seats')||'').split(',').filter(Boolean).map(n=>Number(n));
  const bus = store.get('buses', []).find(b=>b.id===busId);
  if (!bus || !seats.length) location.href='search.html';

  // build passenger inputs
  const holder = $('#passengerList');
  seats.forEach((n,i)=>{
    const wrap = document.createElement('div');
    wrap.className = 'grid-3';
    wrap.innerHTML = `
      <label>Passenger ${i+1} (Seat ${n})
        <input name="pname_${n}" required placeholder="Full name"/>
      </label>
      <label>Age
        <input name="page_${n}" type="number" min="1" max="120" required/>
      </label>
      <label>Gender
        <select name="pgender_${n}" required>
          <option value="">Select</option>
          <option>Male</option><option>Female</option><option>Other</option>
        </select>
      </label>
    `;
    holder.appendChild(wrap);
  });

  $('#passengerForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const u = currentUser() || { id:'GUEST', name:'Guest', email:'' };
    const fd = new FormData(e.target);
    const pax = seats.map(n => ({
      seat:n,
      name: fd.get(`pname_${n}`).trim(),
      age: Number(fd.get(`page_${n}`)),
      gender: fd.get(`pgender_${n}`)
    }));
    const contactEmail = fd.get('contactEmail').trim();
    const contactPhone = fd.get('contactPhone').trim();

    const draft = {
      id: uid('BK'),
      userId: u.id,
      bus,
      journeyDate: date,
      seats,
      passengers: pax,
      contactEmail,
      contactPhone,
      total: seats.length * bus.fare,
      status: 'PENDING_PAYMENT',
      createdAt: new Date().toISOString()
    };
    store.set('paymentDraft', draft);
    location.href = 'payment.html';
  });
}

// ---------- simple toast ----------
function toast(msg){
  alert(msg); // keep minimal; can be upgraded
}

// ---------- expose globally (debug) ----------
// window.store = store;







// ---------- seed admins if missing ----------
(function seedAdmins(){
  if (!store.get('admins')) {
    store.set('admins', [{ id:'A1', name:'Admin', email:'admin@smartbus.app', password:'admin123' }]);
  }
})();

// ---------- payment ----------
if (location.pathname.endsWith('payment.html')){
  const draft = store.get('paymentDraft', null);
  if (!draft){ location.href = 'search.html'; }
  $('#paySummary').textContent =
    `${draft.bus.name} • ${draft.bus.from} → ${draft.bus.to} • ${draft.journeyDate} • Seats: ${draft.seats.join(', ')} • Total: ₹${fmtINR(draft.total)}`;

  $('#paymentForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    // confirm booking
    const bookings = store.get('bookings', []);
    const booking = { ...draft, status:'CONFIRMED', paidAt: new Date().toISOString() };
    bookings.push(booking);
    store.set('bookings', bookings);
    store.del('paymentDraft');
    location.href = `confirmation.html?bid=${booking.id}`;
  });
}

// ---------- tiny QR generator (pseudo grid) ----------
function tinyQR(container, seedText='CODE'){
  // not a real QR; just a deterministic 17x17 pattern for demo
  const hash = Array.from(seedText).reduce((a,c)=> (a*33 + c.charCodeAt(0))>>>0, 5381);
  const size = 17, cell = 6, pad = 8, w = size*cell + pad*2;
  const on = (i,j) => ((hash >> ((i*size+j)%31)) & 1)===1;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w}" viewBox="0 0 ${w} ${w}">
    <rect width="100%" height="100%" fill="#0f1730"/>\n`;
  for (let i=0;i<size;i++){
    for (let j=0;j<size;j++){
      if (on(i,j)) svg += `<rect x="${pad+j*cell}" y="${pad+i*cell}" width="${cell}" height="${cell}" fill="#e8f0ff"/>`;
    }
  }
  svg += `</svg>`;
  container.innerHTML = svg;
}

// ---------- confirmation ----------
if (location.pathname.endsWith('confirmation.html')){
  const params = new URLSearchParams(location.search);
  const bid = params.get('bid');
  const booking = (store.get('bookings', [])).find(b=>b.id===bid) || store.get('paymentDraft', null);
  if (!booking){ location.href='history.html'; }

  $('#ticketMeta').textContent = `${booking.bus.from} → ${booking.bus.to} • ${booking.journeyDate}`;
  $('#ticketDetails').innerHTML = `
    <div><strong>${booking.bus.name}</strong> <span class="muted">(${booking.bus.type})</span></div>
    <div class="muted">${booking.bus.dep} → ${booking.bus.arr} • ${booking.bus.duration}</div>
    <div>Seats: ${booking.seats.join(', ')}</div>
    <div>Total: ₹${fmtINR(booking.total)}</div>
    <div>Status: ${booking.status}</div>
  `;
  $('#ticketPax').innerHTML = booking.passengers.map(p=>`<li>${p.name}, ${p.age}, ${p.gender} (Seat ${p.seat})</li>`).join('');
  $('#ticketCode').textContent = booking.id;
  tinyQR($('#qrBox'), booking.id);

  $('#trackBtn').addEventListener('click', ()=>{
    location.href = `track.html?bid=${booking.id}`;
  });

  // simple download (html blob)
  $('#downloadTicket').addEventListener('click', ()=>{
    const blob = new Blob([document.documentElement.outerHTML], {type:'text/html'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${booking.id}.html`; a.click();
    URL.revokeObjectURL(url);
  });
}

// ---------- history ----------
if (location.pathname.endsWith('history.html')){
  requireAuth();
  const u = currentUser();
  const list = $('#historyList');
  const all = (store.get('bookings', [])).filter(b=>b.userId===u.id).sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
  if (!all.length){ list.innerHTML = `<p class="muted">No bookings yet. <a href="search.html">Book now</a>.</p>`; }
  else {
    list.innerHTML = all.map(b => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div>
            <strong>${b.bus.from} → ${b.bus.to}</strong> • ${b.journeyDate}<br/>
            <span class="muted">${b.bus.name} • Seats: ${b.seats.join(', ')}</span>
          </div>
          <div style="text-align:right">
            <div>₹${fmtINR(b.total)}</div>
            <div class="muted">${b.status}</div>
            <div class="actions" style="margin-top:6px">
              <a class="btn" href="confirmation.html?bid=${b.id}">Ticket</a>
              <a class="btn" href="track.html?bid=${b.id}">Track</a>
              ${b.status==='CONFIRMED' ? `<button class="btn" data-cancel="${b.id}">Cancel</button>`:''}
            </div>
          </div>
        </div>
      </div>
    `).join('');

    list.addEventListener('click', (e)=>{
      const btn = e.target.closest('button[data-cancel]');
      if (!btn) return;
      if (!confirm('Cancel this ticket?')) return;
      const id = btn.dataset.cancel;
      const bookings = store.get('bookings', []);
      const ix = bookings.findIndex(x=>x.id===id);
      if (ix>=0){ bookings[ix].status = 'CANCELLED'; store.set('bookings', bookings); location.reload(); }
    });
  }
}

// ---------- tracking (dummy animation) ----------
if (location.pathname.endsWith('track.html')){
  const params = new URLSearchParams(location.search);
  const bid = params.get('bid');
  let booking = (store.get('bookings', [])).find(b => b.id === bid);
  if (!booking) {
    // maybe the user entered a Bus ID instead of Booking ID
    const bus = store.get('buses', []).find(b => b.id === bid);
    if (bus) {
      booking = { bus, journeyDate: '(Date not provided)', seats: [] };
    }
  }

  if (booking && booking.bus) {
    $('#trackTitle').textContent = `Tracking • ${booking.bus.name}`;
    $('#trackMeta').textContent = `${booking.bus.from} → ${booking.bus.to} • ${booking.journeyDate} • ${booking.bus.dep} → ${booking.bus.arr}`;
  }

  if (booking){
    $('#trackTitle').textContent = `Tracking • ${booking.bus.name}`;
    $('#trackMeta').textContent = `${booking.bus.from} → ${booking.bus.to} • ${booking.journeyDate} • ${booking.bus.dep} → ${booking.bus.arr}`;
  }
  const dot = $('#busDot');
  const bar = $('#progressBar');
  let t = 0;
  setInterval(()=>{
    t = (t + 1) % 101;
    dot.style.left = `${t}%`;
    bar.style.width = `${t}%`;
  }, 120);
}

// ---------- profile ----------
if (location.pathname.endsWith('profile.html')){
  requireAuth();
  const u = currentUser();
  const users = store.get('users', []);
  const userRef = users.find(x=>x.id===u.id);

  const pf = $('#profileForm');
  pf.name.value = u.name; pf.email.value = u.email;
  pf.addEventListener('submit', (e)=>{
    e.preventDefault();
    userRef.name = pf.name.value.trim();
    userRef.email = pf.email.value.trim().toLowerCase();
    store.set('users', users);
    store.set('sessionUser', { id: userRef.id, name: userRef.name, email: userRef.email });
    toast('Profile updated');
  });

  const pwdForm = $('#pwdForm');
  pwdForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(pwdForm);
    const cur = fd.get('current'), next = fd.get('next'), c2 = fd.get('confirm');
    if (next !== c2) return toast('New passwords do not match.');
    if (userRef.password !== cur) return toast('Current password is incorrect.');
    userRef.password = next; store.set('users', users); toast('Password updated');
    pwdForm.reset();
  });
}

// ---------- admin auth helpers ----------
function adminCurrent(){ return store.get('adminSession', null); }
function adminRequire(redirect='admin-login.html'){ if (!adminCurrent()) location.href = redirect; }

// ---------- admin login/logout ----------
const adminLoginForm = $('#adminLoginForm');
if (adminLoginForm){
  adminLoginForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(adminLoginForm);
    const email = fd.get('email').trim().toLowerCase();
    const password = fd.get('password');
    const admins = store.get('admins', []);
    const ad = admins.find(a=>a.email===email && a.password===password);
    if (!ad) return alert('Invalid admin credentials');
    store.set('adminSession', { id: ad.id, name: ad.name, email: ad.email });
    location.href = 'admin-dashboard.html';
  });
}

const adminLogoutBtn = $('#adminLogoutBtn');
if (adminLogoutBtn){
  adminLogoutBtn.addEventListener('click', ()=>{
    store.del('adminSession'); location.href = 'admin-login.html';
  });
}

// ---------- admin dashboard ----------
if (location.pathname.endsWith('admin-dashboard.html')){
  adminRequire();
  $('#countBuses').textContent = store.get('buses', []).length;
  $('#countBookings').textContent = store.get('bookings', []).length;
  $('#countUsers').textContent = store.get('users', []).length;
}

// ---------- manage buses ----------
if (location.pathname.endsWith('manage-buses.html')){
  adminRequire();
  const list = $('#busList');
  const form = $('#busForm');
  const title = $('#busFormTitle');
  const resetBtn = $('#resetBusForm');

  function render(){
    const buses = store.get('buses', []);
    list.innerHTML = buses.map(b => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
          <div>
            <strong>${b.name}</strong> <span class="muted">(${b.type})</span><br/>
            <span class="muted">${b.operator}</span> • ${b.from} → ${b.to}<br/>
            <span class="muted">${b.dep} → ${b.arr} • ${b.duration} • Seats: ${b.seats}</span>
          </div>
          <div style="text-align:right">
            <div>₹${fmtINR(b.fare)}</div>
            <div class="actions" style="margin-top:6px">
              <button class="btn" data-edit="${b.id}">Edit</button>
              <button class="btn" data-del="${b.id}">Delete</button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }
  render();

  list.addEventListener('click', (e)=>{
    const edit = e.target.closest('button[data-edit]');
    const del = e.target.closest('button[data-del]');
    const buses = store.get('buses', []);
    if (edit){
      const id = edit.dataset.edit;
      const b = buses.find(x=>x.id===id);
      title.textContent = 'Edit Bus';
      Object.entries(b).forEach(([k,v])=>{
        if (form[k] !== undefined) form[k].value = v;
      });
    }
    if (del){
      if (!confirm('Delete this bus?')) return;
      const id = del.dataset.del;
      const left = buses.filter(x=>x.id!==id);
      store.set('buses', left); render();
    }
  });

  resetBtn.addEventListener('click', ()=>{
    form.reset(); form.id.value=''; title.textContent = 'Add Bus';
  });

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    const obj = Object.fromEntries(fd.entries());
    obj.fare = Number(obj.fare); obj.seats = Number(obj.seats);
    let buses = store.get('buses', []);
    if (obj.id){
      const i = buses.findIndex(x=>x.id===obj.id);
      buses[i] = {...buses[i], ...obj};
    } else {
      obj.id = uid('B'); buses.push(obj);
    }
    store.set('buses', buses);
    toast('Saved'); form.reset(); form.id.value=''; title.textContent='Add Bus'; render();
  });
}

// ---------- admin view bookings ----------
if (location.pathname.endsWith('view-bookings.html')){
  adminRequire();
  const tbody = $('#adminBookingsBody');
  const bookings = store.get('bookings', []).sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
  const users = store.get('users', []);
  tbody.innerHTML = bookings.map(b=>{
    const u = users.find(x=>x.id===b.userId) || {name:'Guest'};
    return `<tr>
      <td>${b.id}</td>
      <td>${u.name}</td>
      <td>${b.bus.from} → ${b.bus.to}</td>
      <td>${b.journeyDate}</td>
      <td>${b.seats.join(', ')}</td>
      <td>₹${fmtINR(b.total)}</td>
      <td>${b.status}</td>
    </tr>`;
  }).join('');
}




// ---------- Home page: Real-time Tracking button ----------
const homeTrackBtn = $('#homeTrackBtn');
if (homeTrackBtn) {
  homeTrackBtn.addEventListener('click', () => {
    const id = prompt("Enter your Booking ID or Bus ID to track:");
    if (!id) return;
    location.href = `track.html?bid=${encodeURIComponent(id.trim())}`;
  });
}
