import React, { useState, useEffect } from 'react';
import { Home, BookOpen, Phone, Key, LayoutDashboard } from 'lucide-react';
import { fetchCurrentUser } from './lib/api';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import CoursesPage from './pages/CoursesPage';
import AuthPage from './pages/AuthPage';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import HodDashboard from './pages/HodDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ContactPage from './pages/ContactPage';
import SubjectDetailPage from './pages/SubjectDetailPage';
import SkyBackground from './components/SkyBackground';
import RightSidebar from './components/RightSidebar';
import ClickSpark from './components/ClickSpark';
import Dock from './components/Dock';

function App() {
  const [theme, setTheme] = useState('light');
  const [palette, setPalette] = useState('indigo');
  const [currentRole, setCurrentRole] = useState('guest');
  const [currentPage, setCurrentPage] = useState('landing');
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [selectedOfferingId, setSelectedOfferingId] = useState(null);

  const openSubject = (subjectId, offeringId = null) => {
    setSelectedSubjectId(subjectId);
    setSelectedOfferingId(offeringId);
    setCurrentPage('subject-detail');
  };

  // Weather state
  const [weather, setWeather] = useState('sunny');
  const [temp, setTemp] = useState('');

  // Timer states (seconds)
  const [sessionTime, setSessionTime] = useState(0);
  const [todayUsed, setTodayUsed] = useState(0);
  const [totalUsed, setTotalUsed] = useState(0);

  // Daily Streak states
  const [streak, setStreak] = useState(0);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);

  // Fetch weather centrally once on mount
  useEffect(() => {
    fetch('https://wttr.in/?format=j1')
      .then(res => res.json())
      .then(data => {
        const condition = data.current_condition[0];
        const desc = condition.weatherDesc[0].value.toLowerCase();
        const tVal = condition.temp_C;
        setTemp(tVal + '°C');
        if (desc.includes('rain') || desc.includes('shower') || desc.includes('drizzle')) {
          setWeather('rainy');
        } else if (desc.includes('snow') || desc.includes('ice') || desc.includes('freeze')) {
          setWeather('snowy');
        } else if (desc.includes('thunder') || desc.includes('storm')) {
          setWeather('stormy');
        } else if (desc.includes('cloud') || desc.includes('overcast') || desc.includes('mist') || desc.includes('fog')) {
          setWeather('cloudy');
        } else {
          setWeather('sunny');
        }
      })
      .catch(() => {});
  }, []);

  // Initialise session details from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('phazon_theme') || 'light';
    const savedPalette = localStorage.getItem('phazon_palette') || 'indigo';
    setTheme(savedTheme);
    setPalette(savedPalette);

    // Verify auth token with server for session restoration
    const token = localStorage.getItem('phazon_auth_token');
    if (token) {
      fetchCurrentUser()
        .then(user => {
          localStorage.setItem('phazon_logged_in_user', JSON.stringify(user));
          setCurrentRole(user.role);
        })
        .catch(() => {
          // Token invalid or expired — clear and stay as guest
          localStorage.removeItem('phazon_auth_token');
          localStorage.removeItem('phazon_logged_in_user');
          setCurrentRole('guest');
        });
    }

    const today = new Date().toDateString();
    const lastDate = localStorage.getItem('phazon_timer_date');
    if (lastDate === today) {
      setTodayUsed(parseInt(localStorage.getItem('phazon_today_used') || '0'));
    } else {
      setTodayUsed(0);
      localStorage.setItem('phazon_timer_date', today);
      localStorage.setItem('phazon_today_used', '0');
    }
    setTotalUsed(parseInt(localStorage.getItem('phazon_total_used') || '0'));

    const streakVal = parseInt(localStorage.getItem('phazon_streak') || '0');
    setStreak(streakVal);

    const lastCheckIn = localStorage.getItem('phazon_last_check_in');
    if (lastCheckIn === today) {
      setHasCheckedIn(true);
    } else if (lastCheckIn) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastCheckIn !== yesterday.toDateString() && lastCheckIn !== today) {
        setStreak(0);
        localStorage.setItem('phazon_streak', '0');
      }
    }
  }, []);

  // Listen for forced logout events (triggered by api.js on 401)
  useEffect(() => {
    const handleForcedLogout = () => {
      setCurrentRole('guest');
      setCurrentPage('auth');
    };
    window.addEventListener('phazon_logout', handleForcedLogout);
    return () => window.removeEventListener('phazon_logout', handleForcedLogout);
  }, []);

  // Synchronise theme and palette settings to DOM attributes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('phazon_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-palette', palette);
    localStorage.setItem('phazon_palette', palette);
  }, [palette]);

  // Real-time active portal duration timers
  useEffect(() => {
    let interval = null;
    const isTabActive = () => document.visibilityState === 'visible';

    const handleVisibilityChange = () => {
      if (!isTabActive() && interval) {
        clearInterval(interval);
        interval = null;
      } else if (isTabActive() && !interval) {
        startTimer();
      }
    };

    const startTimer = () => {
      interval = setInterval(() => {
        setSessionTime((prev) => prev + 1);
        setTodayUsed((prev) => {
          const next = prev + 1;
          localStorage.setItem('phazon_today_used', next.toString());
          return next;
        });
        setTotalUsed((prev) => {
          const next = prev + 1;
          localStorage.setItem('phazon_total_used', next.toString());
          return next;
        });
      }, 1000);
    };

    if (isTabActive()) {
      startTimer();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleCheckIn = () => {
    if (hasCheckedIn) return;
    const today = new Date().toDateString();
    const nextStreak = streak + 1;
    setStreak(nextStreak);
    setHasCheckedIn(true);
    localStorage.setItem('phazon_streak', nextStreak.toString());
    localStorage.setItem('phazon_last_check_in', today);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage setCurrentPage={setCurrentPage} currentRole={currentRole} theme={theme} weather={weather} temp={temp} palette={palette} />;
      case 'courses':
        return <CoursesPage onOpenSubject={openSubject} />;
      case 'contact':
        return <ContactPage />;
      case 'auth':
        return <AuthPage setCurrentRole={setCurrentRole} setCurrentPage={setCurrentPage} theme={theme} />;
      case 'subject-detail':
        return <SubjectDetailPage subjectId={selectedSubjectId} offeringId={selectedOfferingId} onBack={() => setCurrentPage('courses')} userRole={currentRole} />;
      case 'dashboard':
        if (currentRole === 'student') {
          return <StudentDashboard theme={theme} onOpenSubject={openSubject} />;
        } else if (currentRole === 'teacher') {
          return <TeacherDashboard onOpenSubject={openSubject} />;
        } else if (currentRole === 'hod') {
          return <HodDashboard onOpenSubject={openSubject} />;
        } else if (currentRole === 'admin') {
          return <AdminDashboard onOpenSubject={openSubject} />;
        }
        return <AuthPage setCurrentRole={setCurrentRole} setCurrentPage={setCurrentPage} theme={theme} />;
      default:
        return <LandingPage setCurrentPage={setCurrentPage} currentRole={currentRole} theme={theme} weather={weather} temp={temp} />;
    }
  };

  // Magnifying Dock items
  const dockItems = [
    { icon: <Home size={18} />, label: 'Home', onClick: () => setCurrentPage('landing') },
    { icon: <BookOpen size={18} />, label: 'Courses', onClick: () => setCurrentPage('courses') },
    { icon: <Phone size={18} />, label: 'Contact', onClick: () => setCurrentPage('contact') },
    {
      icon: currentRole === 'guest' ? <Key size={18} /> : <LayoutDashboard size={18} />,
      label: currentRole === 'guest' ? 'Sign In' : 'Workspace',
      onClick: () => {
        if (currentRole === 'guest') {
          setCurrentPage('auth');
        } else {
          setCurrentPage('dashboard');
        }
      }
    }
  ];

  return (
    <ClickSpark sparkColor="var(--primary)" sparkSize={10} sparkRadius={28} sparkCount={10} duration={450}>
      <SkyBackground theme={theme} weather={weather} temp={temp} currentPage={currentPage}>
        <div className="app-viewport" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
          
          {/* Navigation Header */}
          <Header
            theme={theme}
            setTheme={setTheme}
            palette={palette}
            setPalette={setPalette}
            currentRole={currentRole}
            setCurrentRole={setCurrentRole}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            weather={weather}
            temp={temp}
          />

          {/* Dynamic Route Content */}
          <main className="container" style={{ flex: 1, zIndex: 10, position: 'relative' }}>
            {renderPage()}
          </main>

          {/* Floating Navigation Dock (shown on public pages) */}
          {currentPage !== 'dashboard' && (
            <Dock items={dockItems} panelHeight={64} baseItemSize={44} magnification={65} />
          )}

          {/* Global Floating Settings Sidebar Hub */}
          <RightSidebar
            theme={theme}
            setTheme={setTheme}
            palette={palette}
            setPalette={setPalette}
            sessionTime={sessionTime}
            todayUsed={todayUsed}
            totalUsed={totalUsed}
            streak={streak}
            hasCheckedIn={hasCheckedIn}
            handleCheckIn={handleCheckIn}
          />

          {/* Footer */}
          <Footer />
          
        </div>
      </SkyBackground>
    </ClickSpark>
  );
}

export default App;