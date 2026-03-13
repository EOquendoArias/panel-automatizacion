const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const db = require("../database");
require("dotenv").config();

/* ---------- GOOGLE STRATEGY ---------- */

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        "https://panel.redimidosdelasnaciones.com/auth/google/callback",
    },

    function (accessToken, refreshToken, profile, done) {
      try {
        const email = profile.emails[0].value;

        console.log("Login Google:", email);

        db.get(
          "SELECT * FROM usuarios WHERE email = ?",
          [email],
          (err, user) => {
            if (err) {
              console.log("Error DB:", err);
              return done(err, null);
            }

            if (!user) {
              console.log("Usuario no autorizado:", email);
              return done(null, false);
            }

            console.log("Usuario autorizado:", email);

            return done(null, user);
          }
        );
      } catch (error) {
        console.log("Error Google Auth:", error);
        return done(error, null);
      }
    }
  )
);

/* ---------- SERIALIZE USER ---------- */

passport.serializeUser((user, done) => {
  done(null, user.id);
});

/* ---------- DESERIALIZE USER ---------- */

passport.deserializeUser((id, done) => {
  db.get("SELECT * FROM usuarios WHERE id = ?", [id], (err, user) => {
    if (err) {
      return done(err, null);
    }

    done(null, user);
  });
});

module.exports = passport;
