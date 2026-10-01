'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function Home() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const q = query(collection(db, 'schedule'), limit(5));
        const snapshot = await getDocs(q);
        setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Firebase error", error);
      }
    }
    fetchData();
  }, []);

  return (
    <main className="min-h-screen p-8 bg-gray-50 text-gray-900">
      <h1 className="text-3xl font-bold mb-6">Schedule Dashboard</h1>
      <div className="grid gap-4">
        {data.length === 0 ? <p>Loading schedule or no data found...</p> : (
          data.map(item => (
            <div key={item.id} className="p-4 bg-white shadow rounded-lg border border-gray-200">
              <h2 className="text-xl font-semibold">{item.title}</h2>
              <p className="text-gray-600 capitalize">{item.category} • {item.date}</p>
              <p className="text-gray-500">{item.startTime} - {item.endTime}</p>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
