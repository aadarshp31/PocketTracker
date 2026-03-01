import supabaseClient from "../config/authConfig";
import UserSignupDTO from "../interfaces/DTO/UserSignupDTO";


export default class AuthService {

    constructor() { }

    async signup(userDetails: UserSignupDTO) {
        const { data, error } = await supabaseClient.auth.signUp({
            email: userDetails.email,
            password: userDetails.password,
            options: {
                data: {
                    email: userDetails.email,
                    password: userDetails.password,
                    first_name: userDetails.first_name,
                    last_name: userDetails.last_name
                },
                emailRedirectTo: process.env.SIGNUP_EMAIL_REDIRECT_LINK
            }
        });

        return { data, error };
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
}