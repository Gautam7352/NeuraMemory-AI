import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export const signUpNewUser = async (userEmail: string, userPassword: string) => {
    const { data, error } = await supabase.auth.signUp({
        email: userEmail,
        password: userPassword,
        options: {
            emailRedirectTo: 'https://neura-memory-ai.vercel.app/',
        },
    });

    return { data, error };
};

export const signInUser = async (userEmail: string, userPassword: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: userPassword
    });

    return { data, error };
}

export const forgetPassword = async (userEmail: string) => {
    return await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: 'https://neura-memory-ai.vercel.app/update-password',
    });
}
