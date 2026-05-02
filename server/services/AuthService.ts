import supabaseClient from "../config/authConfig";
import UserSignupDTO from "../interfaces/DTO/UserSignupDTO";
import UserModel from "../models/UserModel";


export default class AuthService {

    constructor() { }

    async signup(userDetails: UserSignupDTO) {
        try {
            // Sign up with Supabase Auth
            const { data, error } = await supabaseClient.auth.signUp({
                email: userDetails.email,
                password: userDetails.password,
                options: {
                    data: {
                        email: userDetails.email,
                        first_name: userDetails.first_name,
                        last_name: userDetails.last_name
                    },
                    emailRedirectTo: process.env.SIGNUP_EMAIL_REDIRECT_LINK
                }
            });

            if (error || !data.user) {
                return { data: null, error };
            }

            // Create user record in database
            try {
                const dbUser = await UserModel.create({
                    supabase_id: data.user.id,
                    email: userDetails.email,
                    first_name: userDetails.first_name,
                    last_name: userDetails.last_name
                });

                return { data: { user: data.user, dbUser: dbUser.toJSON() }, error: null };
            } catch (dbError: any) {
                // If database creation fails, we may want to delete the auth user
                // For now, return the auth user data but log the db error
                console.error("Database user creation failed:", dbError);
                return { data: { user: data.user }, error: dbError };
            }

        } catch (err) {
            return { data: null, error: err };
        }
    }

    async signin(userDetails: UserSignupDTO) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: userDetails.email,
            password: userDetails.password
        });

        return { data, error };
    }

    async signout(userDetails: UserSignupDTO) {
        const { error } = await supabaseClient.auth.signOut();
        return { error };
    }

    async getUserBySuperbaseId(supabaseId: string) {
        try {
            const user = await UserModel.findOne({
                where: { supabase_id: supabaseId }
            });
            return user;
        } catch (error) {
            return null;
        }
    }
}