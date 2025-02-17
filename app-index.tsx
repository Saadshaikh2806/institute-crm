import React, { useState, useEffect } from 'react';
// Remove this import:
// import { supabase } from './supabaseClient';
// Use the auth helpers to include the JWT in requests
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';

// Define a session type with a user property
type Session = {
  user: {
    id: string;
    email: string;
    // ...other properties if needed
  }
};

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  // Instantiate an authenticated Supabase client that sends session JWT
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function getSession() {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (currentSession) {
        // Use non-null assertion for email
        setSession({ user: { id: currentSession.user.id, email: currentSession.user.email! } });
      }
    }
    getSession();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    
    if (!currentSession?.user?.id) {
      toast.error("Please sign in to add customers");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const customerData = {
      user_id: currentSession.user.id,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string || '',
      source: 'direct',
      status: 'lead'
    };

    console.log('Attempting to insert:', customerData);
    
    const { data, error } = await supabase
      .from('customers')
      .insert(customerData)
      .select()
      .single();
      
    if (error) {
      console.error("Error adding customer:", error);
      toast.error(error.message);
      return;
    }
    
    toast.success("Customer added successfully");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="name" placeholder="Name" required />
      <input type="email" name="email" placeholder="Email" required />
      {/* ...other form fields... */}
      <button type="submit">Add Customer</button>
    </form>
  );
};

export default App;
