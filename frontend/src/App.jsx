
import React, { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [me, setMe] = useState(null);

  // Forms
  const [registerForm, setRegisterForm] = useState({ name:"", email:"", phone:"", dob:"", password:"" });
  const [loginForm, setLoginForm] = useState({ email:"", password:"" });
  const [staffLogin, setStaffLogin] = useState({ email:"staff@smilecare.com", password:"password123" });

  // Appointments
  const [myAppointments, setMyAppointments] = useState([]);
  const [aptForm, setAptForm] = useState({ date:"", time:"", reason:"" });

  // Staff data
  const [staffToken, setStaffToken] = useState(localStorage.getItem("staffToken") || "");
  const [patients, setPatients] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);

  // --- helpers ---
  async function api(path, options = {}, useStaff = false) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    const t = useStaff ? staffToken : token;
    if (t) headers["Authorization"] = `Bearer ${t}`;
    const res = await fetch(`${API}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  // Load profile if token exists
  useEffect(() => {
    if (!token) { setMe(null); return; }
    api("/api/me").then(setMe).catch(() => { setToken(""); localStorage.removeItem("token"); });
  }, [token]);

  // Load client appointments
  useEffect(() => {
    if (!token) { setMyAppointments([]); return; }
    api("/api/appointments").then(setMyAppointments).catch(() => {});
  }, [token]);

  // Load staff data
  useEffect(() => {
    if (!staffToken) { setPatients([]); setAllAppointments([]); return; }
    Promise.all([
      api("/api/staff/patients", {}, true),
      api("/api/staff/appointments", {}, true)
    ]).then(([p, a]) => { setPatients(p); setAllAppointments(a); }).catch(() => {});
  }, [staffToken]);

  // --- Auth handlers ---
  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const resp = await api("/api/auth/register", { method:"POST", body: JSON.stringify(registerForm) });
      setToken(resp.token); localStorage.setItem("token", resp.token);
      setRegisterForm({ name:"", email:"", phone:"", dob:"", password:"" });
      setActiveTab("client-dashboard");
    } catch (err) { alert(err.message); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const resp = await api("/api/auth/login", { method:"POST", body: JSON.stringify(loginForm) });
      if (resp.user.role === "staff") {
        setStaffToken(resp.token); localStorage.setItem("staffToken", resp.token);
        setActiveTab("reports");
      } else {
        setToken(resp.token); localStorage.setItem("token", resp.token);
        setActiveTab("client-dashboard");
      }
      setLoginForm({ email:"", password:"" });
    } catch (err) { alert(err.message); }
  };

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    try {
      const resp = await api("/api/auth/login", { method:"POST", body: JSON.stringify(staffLogin) });
      if (resp.user.role !== "staff") throw new Error("Not a staff account");
      setStaffToken(resp.token); localStorage.setItem("staffToken", resp.token);
      setActiveTab("reports");
    } catch (err) { alert(err.message); }
  };

  // --- Client appointment handlers ---
  const handleBook = async (e) => {
    e.preventDefault();
    try {
      if (!token) throw new Error("Please login first");
      await api("/api/appointments", { method:"POST", body: JSON.stringify(aptForm) });
      setAptForm({ date:"", time:"", reason:"" });
      const list = await api("/api/appointments");
      setMyAppointments(list);
      alert("Appointment booked!");
    } catch (err) { alert(err.message); }
  };

  const today = new Date().toISOString().split("T")[0];
  const upcoming = myAppointments.filter(a => a.date >= today).sort((a,b)=> a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const past = myAppointments.filter(a => a.date < today).sort((a,b)=> b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  // UI helpers
  const NavButton = ({id, label}) => (
    <button onClick={()=>setActiveTab(id)} className={`hover:text-teal-200 ${activeTab===id?'underline':''}`}>{label}</button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-teal-700 text-white shadow-md fixed top-0 left-0 w-full z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">SmileCare Dental</h1>
          <nav className="hidden md:flex space-x-6 relative">
            <NavButton id="home" label="Home" />
            <div className="relative" onMouseEnter={()=>setDropdownOpen(true)} onMouseLeave={()=>setDropdownOpen(false)}>
              <button className="hover:text-teal-200">Services</button>
              {dropdownOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white text-gray-800 rounded-md shadow-lg z-50">
                  <ul>
                    <li><button onClick={()=>{setActiveTab('about');setDropdownOpen(false);}} className="block w-full text-left px-4 py-2 hover:bg-gray-100">About Us</button></li>
                    <li><button onClick={()=>{setActiveTab('services');setDropdownOpen(false);}} className="block w-full text-left px-4 py-2 hover:bg-gray-100">All Services</button></li>
                    <li><button onClick={()=>{setActiveTab('testimonials');setDropdownOpen(false);}} className="block w-full text-left px-4 py-2 hover:bg-gray-100">Testimonials</button></li>
                  </ul>
                </div>
              )}
            </div>
            <NavButton id="register" label="Create Account" />
            <NavButton id="login" label="Login" />
            <NavButton id="client-dashboard" label="My Appointments" />
            <NavButton id="book" label="Book Appointment" />
            <NavButton id="reports" label="Staff" />
          </nav>
          <button className="md:hidden text-xl" onClick={()=>setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">&#9776;</button>
        </div>
        {mobileMenuOpen && (
          <nav className="md:hidden bg-teal-800 text-white px-4 py-2 space-y-2">
            {["home","about","services","testimonials","register","login","client-dashboard","book","reports"].map(id=>(
              <button key={id} onClick={()=>{setActiveTab(id);setMobileMenuOpen(false);}} className="block w-full text-left py-2 hover:bg-teal-700">{id.replace('-',' ').replace(/\b\w/g,(c)=>c.toUpperCase())}</button>
            ))}
          </nav>
        )}
      </header>

      <main className="container mx-auto px-4 pt-24 pb-12">
        {activeTab === "home" && (
          <section className="bg-gradient-to-r from-teal-500 to-cyan-400 text-white py-16 rounded-lg mb-12 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Welcome to SmileCare Dental</h2>
            <p className="text-lg md:text-xl max-w-2xl mx-auto">Create an account to book and manage your appointments online.</p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <button onClick={()=>setActiveTab('register')} className="bg-white text-teal-700 px-6 py-3 rounded-full font-semibold hover:bg-teal-100 transition">Create Account</button>
              <button onClick={()=>setActiveTab('book')} className="bg-transparent border-2 border-white px-6 py-3 rounded-full font-semibold hover:bg-white hover:text-teal-700 transition">Book Appointment</button>
            </div>
          </section>
        )}

        {activeTab === "register" && (
          <section className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-teal-700">Create a Client Account</h2>
            <form onSubmit={handleRegister} className="space-y-4">
              {["name","email","phone","dob","password"].map((field)=> (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700">{field === 'dob' ? 'Date of Birth' : field[0].toUpperCase()+field.slice(1)}</label>
                  <input type={field==='dob'?'date':field==='password'?'password':field==='email'?'email':'text'}
                         required
                         value={registerForm[field]}
                         onChange={(e)=>setRegisterForm({...registerForm, [field]: e.target.value})}
                         className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              ))}
              <button type="submit" className="w-full bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700 transition mt-4">Sign Up</button>
            </form>
          </section>
        )}

        {activeTab === "login" && (
          <section className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-6 text-teal-700">Client Login</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" required value={loginForm.email} onChange={(e)=>setLoginForm({...loginForm, email:e.target.value})} className="mt-1 block w-full px-4 py-2 border rounded-md"/></div>
                <div><label className="block text-sm font-medium text-gray-700">Password</label>
                  <input type="password" required value={loginForm.password} onChange={(e)=>setLoginForm({...loginForm, password:e.target.value})} className="mt-1 block w-full px-4 py-2 border rounded-md"/></div>
                <button type="submit" className="w-full bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700">Login</button>
              </form>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-6 text-teal-700">Staff Login</h2>
              <form onSubmit={handleStaffLogin} className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" required value={staffLogin.email} onChange={(e)=>setStaffLogin({...staffLogin, email:e.target.value})} className="mt-1 block w-full px-4 py-2 border rounded-md"/></div>
                <div><label className="block text-sm font-medium text-gray-700">Password</label>
                  <input type="password" required value={staffLogin.password} onChange={(e)=>setStaffLogin({...staffLogin, password:e.target.value})} className="mt-1 block w-full px-4 py-2 border rounded-md"/></div>
                <button type="submit" className="w-full bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700">Login</button>
                <p className="text-sm text-gray-500 mt-2">Seeded staff user: staff@smilecare.com / password123</p>
              </form>
            </div>
          </section>
        )}

        {activeTab === "client-dashboard" && (
          <section>
            <h2 className="text-3xl font-bold mb-6 text-teal-700 text-center">My Appointments</h2>
            {!token ? (
              <p className="text-center text-gray-600">Please login to see your appointments.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-semibold mb-4">Book New Appointment</h3>
                  <form onSubmit={handleBook} className="space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700">Date</label>
                      <input type="date" min={today} required value={aptForm.date} onChange={(e)=>setAptForm({...aptForm, date:e.target.value})} className="mt-1 block w-full px-4 py-2 border rounded-md"/></div>
                    <div><label className="block text-sm font-medium text-gray-700">Time</label>
                      <input type="time" min="09:00" max="17:00" step="1800" required value={aptForm.time} onChange={(e)=>setAptForm({...aptForm, time:e.target.value})} className="mt-1 block w-full px-4 py-2 border rounded-md"/></div>
                    <div><label className="block text-sm font-medium text-gray-700">Reason</label>
                      <textarea required rows="3" value={aptForm.reason} onChange={(e)=>setAptForm({...aptForm, reason:e.target.value})} className="mt-1 block w-full px-4 py-2 border rounded-md"></textarea></div>
                    <button type="submit" className="w-full bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700">Book</button>
                  </form>
                </div>
                <div>
                  <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    <h3 className="text-xl font-semibold mb-2">Upcoming</h3>
                    {upcoming.length ? (
                      <table className="min-w-full table-auto border-collapse">
                        <thead className="bg-teal-100"><tr><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-left">Time</th><th className="px-4 py-2 text-left">Reason</th></tr></thead>
                        <tbody>{upcoming.map(a=>(<tr key={a.id} className="border-b"><td className="px-4 py-2">{a.date}</td><td className="px-4 py-2">{a.time}</td><td className="px-4 py-2">{a.reason}</td></tr>))}</tbody>
                      </table>
                    ) : <p className="text-gray-500">No upcoming appointments.</p>}
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold mb-2">Past</h3>
                    {past.length ? (
                      <table className="min-w-full table-auto border-collapse">
                        <thead className="bg-teal-100"><tr><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-left">Time</th><th className="px-4 py-2 text-left">Reason</th></tr></thead>
                        <tbody>{past.map(a=>(<tr key={a.id} className="border-b"><td className="px-4 py-2">{a.date}</td><td className="px-4 py-2">{a.time}</td><td className="px-4 py-2">{a.reason}</td></tr>))}</tbody>
                      </table>
                    ) : <p className="text-gray-500">No past appointments.</p>}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === "reports" && (
          <section className="bg-white p-6 rounded-lg shadow-md">
            {!staffToken ? (
              <div className="max-w-md mx-auto">
                <h2 className="text-2xl font-bold mb-6 text-teal-700">Staff Login</h2>
                <p className="text-gray-600 mb-4">Please go to the Login tab and use the Staff Login form.</p>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-6 text-teal-700">Staff Reports</h2>
                <div className="mb-8 overflow-x-auto">
                  <h3 className="text-xl font-semibold mb-2">Patients</h3>
                  <table className="min-w-full table-auto border-collapse">
                    <thead className="bg-teal-100"><tr><th className="px-4 py-2 text-left">Name</th><th className="px-4 py-2 text-left">Email</th><th className="px-4 py-2 text-left">Phone</th><th className="px-4 py-2 text-left">DOB</th></tr></thead>
                    <tbody>
                      {patients.length ? patients.map(p=>(<tr key={p.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">{p.name}</td><td className="px-4 py-2">{p.email}</td><td className="px-4 py-2">{p.phone}</td><td className="px-4 py-2">{p.dob}</td>
                      </tr>)) : (<tr><td colSpan="4" className="px-4 py-6 text-center text-gray-500">No patients.</td></tr>)}
                    </tbody>
                  </table>
                </div>

                <div className="mb-8 overflow-x-auto">
                  <h3 className="text-xl font-semibold mb-2">All Appointments</h3>
                  <table className="min-w-full table-auto border-collapse">
                    <thead className="bg-teal-100"><tr><th className="px-4 py-2 text-left">Patient</th><th className="px-4 py-2 text-left">Email</th><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-left">Time</th><th className="px-4 py-2 text-left">Reason</th></tr></thead>
                    <tbody>
                      {allAppointments.length ? allAppointments.map(a=>(<tr key={a.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">{a.patient_name}</td><td className="px-4 py-2">{a.patient_email}</td><td className="px-4 py-2">{a.date}</td><td className="px-4 py-2">{a.time}</td><td className="px-4 py-2">{a.reason}</td>
                      </tr>)) : (<tr><td colSpan="5" className="px-4 py-6 text-center text-gray-500">No appointments.</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {/* About/Services/Testimonials can be copied from your existing content as needed */}
        {activeTab === "about" && (
          <section className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-teal-700">About Us</h2>
            <p>We provide compassionate, high-quality dental care.</p>
          </section>
        )}
        {activeTab === "services" && (
          <section className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-teal-700">Services</h2>
            <p>Routine cleanings, fillings, whitening, orthodontics, and more.</p>
          </section>
        )}
        {activeTab === "testimonials" && (
          <section className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4 text-teal-700">Testimonials</h2>
            <p>Our patients love us!</p>
          </section>
        )}
      </main>

      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; {new Date().getFullYear()} SmileCare Dental. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
