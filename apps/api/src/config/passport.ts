import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import bcrypt from 'bcryptjs';
import User, { IUser } from '../models/User';

export const configurePassport = () => {
  // Local Strategy
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email: string, password: string, done: (err: any, user?: any, info?: any) => void) => {
      try {
        const user = await User.findOne({ email, provider: 'local' });
        if (!user) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password || '');
        if (!isMatch) {
          return done(null, false, { message: 'Invalid email or password' });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  // Google Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: '/api/auth/google/callback',
        },
        async (_accessToken: string, _refreshToken: string, profile: any, done: (err: any, user?: any, info?: any) => void) => {
          try {
            let user = await User.findOne({ provider: 'google', providerId: profile.id });

            if (!user) {
              user = await User.create({
                email: profile.emails?.[0].value || '',
                displayName: profile.displayName,
                provider: 'google',
                providerId: profile.id,
                avatarUrl: profile.photos?.[0].value,
              });
            }

            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }

  // GitHub Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: '/api/auth/github/callback',
        },
        async (_accessToken: string, _refreshToken: string, profile: any, done: (err: any, user?: any, info?: any) => void) => {
          try {
            let user = await User.findOne({ provider: 'github', providerId: profile.id });

            if (!user) {
              user = await User.create({
                email: profile.emails?.[0].value || '',
                displayName: profile.displayName || profile.username,
                provider: 'github',
                providerId: profile.id,
                avatarUrl: profile._json.avatar_url,
              });
            }

            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }

  passport.serializeUser((user: any, done: (err: any, id?: any) => void) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done: (err: any, user?: any) => void) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
};
