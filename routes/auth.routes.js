const express = require("express");
const router = express.Router();
const passport = require("passport");

router.get("/login",(req,res)=>{
res.render("pages/login", { layout: false });
});

router.get(
"/auth/google",
passport.authenticate("google",{ scope:["profile","email"] })
);

router.get(
"/auth/google/callback",
passport.authenticate("google",{ failureRedirect:"/login" }),
(req,res)=>{
res.redirect("/");
}
);

router.get("/logout",(req,res)=>{
req.logout(()=>{
res.redirect("/login");
});
});

module.exports = router;
