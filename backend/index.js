const express = require("express")
const cors=require("cors")
require('dotenv').config()
const cookieParser=require('cookie-parser');
const app=express();
app.use(express.json())
app.use(cookieParser())
const port=process.env.PORT
const User=require('./models/user')
const Freelancer = require('./models/freelancer')
const jwt=require('jsonwebtoken');
const mongoose=require('mongoose')
const bcrypt=require('bcryptjs');
const e = require("express");
const dburl=process.env.supaUri
app.use(cors({origin: ["http://localhost:3000"],credentials: true}))
mongoose.connect(process.env.mongoUri)
  .then(() => console.log('Connected to MongoDB cluster'))
  .catch(err => console.error('Could not connect to MongoDB cluster', err));
app.get("/",(req,res)=>{
    res.send("SJobs API is running.....")
})
const isLoggedIn=(req,res,next)=>{
    const token=req.cookies?.token
    // console.log(req.cookies?.token)
    if(!token) return res.status(404).json({success:false,message:"Error. Token missing"})
    try{
        const dec=jwt.verify(token,JWT_SECRET)
        req.user=dec
        next()
    }
    catch(error){console.log(error);return res.status(500).json({success: false,message: "access denied"})}
}
app.listen(port,()=>{
console.log(`Server running on port:${port}`)
})

const random=(max)=>{
    return (Math.floor(Math.random()*100)%max+1).toString()
}
const JWT_SECRET =process.env.JWT_SECRET;

app.post('/register',async(req,res)=>{
    try{
    const {username,password}=req.body
    let exuser=await User.findOne({username: username})
    if(exuser) return res.status(400).json({msg: `User ${username} already exists in the database. Please Login`})
    const hashedPass = await bcrypt.hash(password,10)
    exuser= new User({
        username: username,password:hashedPass
    })
    await exuser.save()
    const token = jwt.sign({username},JWT_SECRET,{expiresIn:"2h"})
    res.cookie('token', token, {
            httpOnly: true,
            expires: false,
            maxAge: 48*60*60*1000
          });
    return res.status(200).json({
        success: true,
        message: `User ${username} was added successfully`
    })
    }
    catch(error){
        res.status(500).json({message:"Error Occured: ",err:error.stack})
    }
})
app.post('/login',async(req,res)=>{
    try{
    const {username,password}=req.body
    const user=await User.findOne({username: username})
    if(!user) return res.status(400).json({success:false,message: `User ${username} doesn't exist in the database. Please Register`})
    const cpass= await bcrypt.compare(password,user.password)
    if(!cpass) return res.status(500).json({success:false, message:"Invalid credentials"})
        const token = jwt.sign({username},JWT_SECRET,{expiresIn:"2h"})
    res.cookie('token', token, {
            httpOnly: true,
            expires: false,
            maxAge: 48*60*60*1000
          });
    return res.status(200).json({
        success: true,
        message: `User ${username} has logged in`
    })
    }
    catch(error){

    }
})


app.get('/testlog',async(req,res)=>{
    const rs = await fetch('http://localhost:8080/login',{
        method:"POST",
        headers:{
            "Content-Type": "application/json",
        },
        credentials: "include",
        body:JSON.stringify({username:'tet',password: 'tet' })
    })
    const rj= await rs.json();
    console.log(rs);
    res.json(rs)
})

app.get('/logout',(req,res)=>{
    res.clearCookie('token', { httpOnly: true, path: '/' });
    return res.status(200).json({msg: "Logged out successfully"})
})

app.get('/check_reg',isLoggedIn,(req,res)=>{
return res.status(200).json({success:true,message: "Logged in"})
})

app.post('/newFL',isLoggedIn,async(req,res)=>{
    try{
    const {name,email,phone,expertise,age}=req.body
    var user= await Freelancer.findOne({email: email})
    if(user){
        user.expertise=[...new Set([...user.expertise,...expertise.toLowerCase().split(',')])]
        await user.save()
        return res.status(200).json({code: true,msg:'Existing freelancer found, expertise updated'})
    }
    user = new Freelancer({
        name: name,
        email: email,
        phone:phone,
        expertise: expertise.toLowerCase().split(','),
        age: age
    })
    await user.save()
    return res.status(200).json({success: true,message:'Freelancer added successfully'})
}
catch(error){
    console.log(error)
    return res.status(500).json("Error Occured"+error.toString())
}
}

)
app.get('/check_reg',isLoggedIn,(req,res)=>{
    return res.status(200).json({success:true,message: "Logged in",user:req.user})
    })

app.get('/findFL',async(req,res)=>{
    const skill=req.query.skill
    if(!skill) res.status(200).json({success: false,message: "Please include a skill"})
    const t=skill.toLowerCase()
    const users= await Freelancer.find()
    console.log(users)
    const flist=[]
    for(user of users){
        if(user.expertise.includes(t)) flist.push(user)
    }
    if(flist.length==0) return res.status(200).json({success: false,message: "No Worker Found"})
    return res.status(200).json({success:true,data: flist})
})