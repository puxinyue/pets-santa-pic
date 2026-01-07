'use client';

import React, { useState, useEffect } from 'react';
import LayoutWithNav from '@/components/LayoutWithNav';
import { Creation } from '@/lib/types';

const MyCreationsPage = () => {
  const [loading, setLoading] = useState(true);
  const [creationsList, setCreationsList] = useState<Creation[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCreations = async () => {
    try {
      const response = await fetch('/api/my-creations');
      if (response.ok) {
        const data = await response.json();
        setCreationsList(data.creations || []);
      }
    } catch (error) {
      console.error('Error fetching creations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCreations();

    // 定期刷新数据，每10秒检查一次
    const interval = setInterval(() => {
      const hasPendingTasks = creationsList.some(task =>
        task.status === 'waiting' || task.status === 'processing'
      );
      if (hasPendingTasks) {
        setRefreshing(true);
        fetchCreations();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <LayoutWithNav>
        <div className="py-24 min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="animate-bounce text-6xl">🐾</div>
              <p className="text-slate-500 dark:text-slate-400 mt-4">Loading your creations...</p>
            </div>
          </div>
        </div>
      </LayoutWithNav>
    );
  }

  return (
    <LayoutWithNav>
      <div className="py-24 min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-16">
            <h1 className="text-5xl font-bold text-slate-900 dark:text-white festive-font">My Creations</h1>
            <button
              onClick={() => {
                setRefreshing(true);
                fetchCreations();
              }}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              {refreshing ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </>
              )}
            </button>
          </div>
          {creationsList.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-32 text-center border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="text-8xl mb-8 opacity-20">📸</div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">No creations yet</h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg">Go to the homepage and create your first festive portrait!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {creationsList.map((c) => (
                <div key={c.id} className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 group hover:shadow-xl transition-all">
                  <div className="relative aspect-square overflow-hidden bg-slate-50 dark:bg-slate-800">
                    {c.status === 'success' && c.generatedImage ? (
                      <>
                        <img src={c.generatedImage} alt={c.style} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-800/90 px-3 py-1 rounded-xl text-[10px] font-bold text-red-600 dark:text-red-400 uppercase shadow-md tracking-widest">{c.style}</div>
                      </>
                    ) : c.status === 'failed' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="text-6xl mb-4">❌</div>
                        <div className="text-center px-4">
                          <p className="text-sm text-red-600 dark:text-red-400 font-medium">{c.errorMessage || 'Generation failed'}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="animate-spin text-6xl mb-4">⏳</div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 text-center px-4">Generating your image...</p>
                      </div>
                    )}
                  </div>
                  <div className="p-6 flex items-center justify-between bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-slate-800">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{c.date}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 capitalize">{c.status}</span>
                    </div>
                    {c.status === 'success' && c.generatedImage && (
                      <button
                        onClick={() => { const link = document.createElement('a'); link.href = c.generatedImage; link.download = `pet-${c.id}.png`; link.click(); }}
                        className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </LayoutWithNav>
  );
};

export default MyCreationsPage;
