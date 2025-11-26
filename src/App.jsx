import React, { useState, useEffect } from 'react';
import { FiClock, FiDollarSign, FiCalendar, FiFileText, FiRefreshCw, FiTrendingUp, FiSave, FiTrash2, FiPieChart } from 'react-icons/fi';

export default function App() {
  const [hourlyRate, setHourlyRate] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [entries, setEntries] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // Load entries and exchange rate from localStorage
  useEffect(() => {
    const loadData = () => {
      try {
        const rateData = localStorage.getItem('exchange_rate');
        if (rateData) {
          const parsedRate = JSON.parse(rateData);
          setExchangeRate(parsedRate.rate);
          setLastUpdated(parsedRate.timestamp);
        }

        const entriesData = localStorage.getItem('work_entries');
        if (entriesData) {
          setEntries(JSON.parse(entriesData));
        }
      } catch (error) {
        console.error('Error loading data from localStorage:', error);
      }
    };
    loadData();
  }, []);

  const fetchExchangeRate = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://api.currencyapi.com/v3/latest?apikey=cur_live_Hz0606riHa1ssqK0wostatwOcs5cQP9Dz6nnjARx&base_currency=GBP&currencies=EGP');
      const data = await response.json();
      const rate = data.data.EGP.value;
      const timestamp = new Date().toLocaleString();
      
      if (rate !== exchangeRate) {
        const updatedEntries = entries.map(entry => ({
          ...entry,
          totalEGP: (parseFloat(entry.totalGBP) * rate).toFixed(2),
          exchangeRate: rate
        }));
        setEntries(updatedEntries);
        localStorage.setItem('work_entries', JSON.stringify(updatedEntries));
      }

      setExchangeRate(rate);
      setLastUpdated(timestamp);
      
      // Save to localStorage
      localStorage.setItem('exchange_rate', JSON.stringify({ rate, timestamp }));
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveEntry = () => {
    if (!hourlyRate || !hoursWorked) return;

    const newEntry = {
      id: editingId || Date.now(),
      hourlyRate: parseFloat(hourlyRate),
      hoursWorked: parseFloat(hoursWorked),
      date,
      notes,
      totalGBP: (parseFloat(hourlyRate) * parseFloat(hoursWorked)).toFixed(2),
      totalEGP: exchangeRate ? ((parseFloat(hourlyRate) * parseFloat(hoursWorked)) * exchangeRate).toFixed(2) : '0.00',
      exchangeRate: exchangeRate || 0,
      savedAt: new Date().toISOString()
    };

    let updatedEntries;
    if (editingId) {
      updatedEntries = entries.map(e => e.id === editingId ? newEntry : e);
      setEditingId(null);
    } else {
      updatedEntries = [newEntry, ...entries];
    }

    setEntries(updatedEntries);
    localStorage.setItem('work_entries', JSON.stringify(updatedEntries));

    // Always clear form after saving
    setHourlyRate('');
    setHoursWorked('');
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const deleteEntry = (id) => {
    const updatedEntries = entries.filter(e => e.id !== id);
    setEntries(updatedEntries);
    localStorage.setItem('work_entries', JSON.stringify(updatedEntries));
  };

  const editEntry = (entry) => {
    setHourlyRate(entry.hourlyRate.toString());
    setHoursWorked(entry.hoursWorked.toString());
    setDate(entry.date);
    setNotes(entry.notes || '');
    setEditingId(entry.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalGBP = hourlyRate && hoursWorked ? (parseFloat(hourlyRate) * parseFloat(hoursWorked)).toFixed(2) : '0.00';
  const totalEGP = exchangeRate && totalGBP ? (parseFloat(totalGBP) * exchangeRate).toFixed(2) : '0.00';

  // Get current month and year
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // Filter entries for current month
  const currentMonthEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
  });

  const monthlyTotalGBP = currentMonthEntries.reduce((sum, entry) => sum + parseFloat(entry.totalGBP), 0).toFixed(2);
  const monthlyTotalEGP = currentMonthEntries.reduce((sum, entry) => sum + parseFloat(entry.totalEGP), 0).toFixed(2);
  
  const monthName = currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  // Generate monthly history
  const getMonthlyHistory = () => {
    const history = {};
    
    entries.forEach(entry => {
      const entryDate = new Date(entry.date);
      const monthKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!history[monthKey]) {
        history[monthKey] = {
          monthName: entryDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
          totalGBP: 0,
          totalEGP: 0,
          totalHours: 0,
          entryCount: 0
        };
      }
      
      history[monthKey].totalGBP += parseFloat(entry.totalGBP);
      history[monthKey].totalEGP += parseFloat(entry.totalEGP);
      history[monthKey].totalHours += parseFloat(entry.hoursWorked);
      history[monthKey].entryCount += 1;
    });
    
    // Convert to array and sort by date (newest first)
    return Object.entries(history)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, data]) => ({
        ...data,
        totalGBP: data.totalGBP.toFixed(2),
        totalEGP: data.totalEGP.toFixed(2),
        totalHours: data.totalHours.toFixed(1)
      }));
  };

  const monthlyHistory = getMonthlyHistory();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4 shadow-lg shadow-purple-500/50">
            <FiTrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">
            Earnings Calculator
          </h1>
          <p className="text-purple-200 text-sm sm:text-base">Track your earnings with live GBP to EGP conversion</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Input Form */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
              {/* Exchange Rate Banner */}
              <div className="bg-gradient-to-r from-purple-600/80 to-pink-600/80 backdrop-blur-sm p-4 sm:p-6 border-b border-white/10">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <FiDollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-purple-100 text-xs sm:text-sm">Exchange Rate</p>
                      <p className="text-white text-xl sm:text-2xl font-bold">
                        {!exchangeRate ? 'Not loaded' : `£1 = ${exchangeRate?.toFixed(2)} EGP`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={fetchExchangeRate}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-300 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span className="text-sm sm:text-base">{loading ? 'Loading...' : 'Fetch Rate'}</span>
                  </button>
                </div>
                {lastUpdated && (
                  <p className="text-purple-100 text-xs mt-3 text-center sm:text-left">Last updated: {lastUpdated}</p>
                )}
              </div>

              {/* Input Section */}
              <div className="p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {/* Hourly Rate Input */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-white font-medium text-sm sm:text-base">
                      <FiDollarSign className="w-4 h-4 text-purple-400" />
                      Hourly Rate (GBP)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300 font-semibold">£</span>
                      <input
                        type="number"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-base sm:text-lg"
                      />
                    </div>
                  </div>

                  {/* Hours Worked Input */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-white font-medium text-sm sm:text-base">
                      <FiClock className="w-4 h-4 text-purple-400" />
                      Hours Worked
                    </label>
                    <input
                      type="number"
                      value={hoursWorked}
                      onChange={(e) => setHoursWorked(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-base sm:text-lg"
                    />
                  </div>
                </div>

                {/* Date Input */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-white font-medium text-sm sm:text-base">
                    <FiCalendar className="w-4 h-4 text-purple-400" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-base sm:text-lg"
                  />
                </div>

                {/* Notes Input */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-white font-medium text-sm sm:text-base">
                    <FiFileText className="w-4 h-4 text-purple-400" />
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about this work session..."
                    rows="3"
                    className="w-full px-4 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Current Calculation */}
              <div className="p-6 sm:p-8 bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-t border-white/10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
                  {/* GBP Total */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20 shadow-lg">
                    <p className="text-purple-200 text-xs sm:text-sm mb-2">Current Total (GBP)</p>
                    <p className="text-3xl sm:text-4xl font-bold text-white">
                      £{totalGBP}
                    </p>
                  </div>

                  {/* EGP Total */}
                  <div className="bg-gradient-to-br from-purple-600/30 to-pink-600/30 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-purple-400/30 shadow-lg shadow-purple-500/20">
                    <p className="text-purple-200 text-xs sm:text-sm mb-2">Current Total (EGP)</p>
                    <p className="text-3xl sm:text-4xl font-bold text-white">
                      {totalEGP} <span className="text-xl sm:text-2xl">ج.م</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={saveEntry}
                  disabled={!hourlyRate || !hoursWorked || !exchangeRate}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl transition-all duration-300 text-white font-semibold text-base sm:text-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg hover:shadow-xl"
                >
                  <FiSave className="w-5 h-5" />
                  {editingId ? 'Update Entry' : 'Save Entry'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Monthly Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 sticky top-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <FiPieChart className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">Monthly Total</h2>
              </div>
              <p className="text-purple-200 text-sm mb-6">{monthName}</p>

              <div className="space-y-4">
                <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                  <p className="text-purple-200 text-sm mb-2">Total Earnings (GBP)</p>
                  <p className="text-4xl font-bold text-white">£{monthlyTotalGBP}</p>
                </div>

                <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-2xl p-5 border border-purple-400/20">
                  <p className="text-purple-200 text-sm mb-2">Total Earnings (EGP)</p>
                  <p className="text-4xl font-bold text-white">{monthlyTotalEGP} <span className="text-2xl">ج.م</span></p>
                </div>

                <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                  <p className="text-purple-200 text-sm mb-2">Total Entries</p>
                  <p className="text-4xl font-bold text-white">{currentMonthEntries.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly History and Entries */}
        {entries.length > 0 && (
          <div className="mt-8 space-y-8">
            {/* Monthly History */}
            {monthlyHistory.length > 0 && (
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                <div className="p-6 sm:p-8 border-b border-white/10">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">Monthly History</h2>
                </div>
                <div className="p-6 sm:p-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {monthlyHistory.map((month, index) => (
                      <div
                        key={index}
                        className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:border-purple-400/30 transition-all"
                      >
                        <h3 className="text-white font-bold text-lg mb-4">{month.monthName}</h3>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-purple-200 text-sm">Total Hours</span>
                            <span className="text-white font-semibold">{month.totalHours}h</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-purple-200 text-sm">Entries</span>
                            <span className="text-white font-semibold">{month.entryCount}</span>
                          </div>
                          
                          <div className="pt-3 border-t border-white/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-purple-200 text-sm">Total (GBP)</span>
                              <span className="text-white font-bold text-lg">£{month.totalGBP}</span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-purple-200 text-sm">Total (EGP)</span>
                              <span className="text-purple-300 font-bold text-lg">{month.totalEGP} ج.م</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Individual Entries */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
              <div className="p-6 sm:p-8 border-b border-white/10">
                <h2 className="text-2xl sm:text-3xl font-bold text-white">All Entries</h2>
              </div>
              <div className="p-6 sm:p-8">
                <div className="space-y-4">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/10 hover:bg-white/10 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                            <p className="text-white font-semibold text-lg">
                              {new Date(entry.date).toLocaleDateString('en-GB', { 
                                day: 'numeric', 
                                month: 'short', 
                                year: 'numeric' 
                              })}
                            </p>
                            <span className="hidden sm:inline text-purple-300">•</span>
                            <p className="text-purple-200 text-sm">
                              {entry.hoursWorked}h @ £{entry.hourlyRate}/hr
                            </p>
                          </div>
                          {entry.notes && (
                            <p className="text-purple-200 text-sm mb-3">{entry.notes}</p>
                          )}
                          <div className="flex flex-wrap gap-4">
                            <div className="bg-white/5 rounded-lg px-3 py-2">
                              <p className="text-xs text-purple-300">GBP</p>
                              <p className="text-white font-bold">£{entry.totalGBP}</p>
                            </div>
                            <div className="bg-purple-600/20 rounded-lg px-3 py-2">
                              <p className="text-xs text-purple-300">EGP</p>
                              <p className="text-white font-bold">{entry.totalEGP} ج.م</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 sm:flex-col">
                          <button
                            onClick={() => editEntry(entry)}
                            className="flex-1 sm:flex-none px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 rounded-lg text-white text-sm font-medium transition-all cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="flex-1 sm:flex-none px-4 py-2 bg-red-600/30 hover:bg-red-600/50 rounded-lg text-white text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <FiTrash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}