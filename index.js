const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
const bodyparser = require('body-parser');
require('dotenv').config()

app.use(cors())
app.use(bodyparser.urlencoded({extended: true}));
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

mongoose.connect(process.env.MONGO_URI,{ useNewUrlParser: true, useUnifiedTopology: true });

const UserSchema = mongoose.Schema({
  username: {type: String, required: true},
  exercises: [{
    description: {type: String, required: true},
    duration: {type: Number, required: true},
    date: String
  }]
});

const User = mongoose.model("User", UserSchema);

app.post('/api/users', function(req, res){
  let name = req.body.username;
  
  if(!name){
    return res.send("Username is required!");
  }

  let user = new User({
    username: req.body.username
  });
  user.save();
  res.json({"username": user.username, "_id": user._id});
});

app.post('/api/users/:_id/exercises', async function(req, res){
  let id = req.params._id;
  let {description, duration, date} = req.body;
  date = date ? new Date(date).toDateString() : new Date().toDateString();

  if(!description || !duration){
    return res.send("The description and duration are required!")
  }

  let AddExercise = {
    description,
    duration,
    date
  }

  try{
    let user = await User.findOneAndUpdate({_id: id},
      { $push:{exercises: AddExercise}},
      {new:true} 
    );

    if(!user){
      res.send("Could'nt find user!")
    } else {
      let newUserExercise = user.exercises[user.exercises.length-1]; 
      res.json({
        _id: user._id,
        username: user.username,
        description: newUserExercise.description,
        duration: newUserExercise.duration,
        date: newUserExercise.date
      });
    }
  } catch(err){
    res.send("Somthing was wrong: " + err);
  }
});

app.get('/api/users/', async function(req, res){
  res.json(await User.find({}).select('username _id'));
});

app.get('/api/users/:_id/logs?', async function(req, res){
  let limit = +req.query.limit || Infinity;;
  let from = req.query.from ? new Date(req.query.from) : null;
  let to = req.query.to ? new Date(req.query.to) : null;
  let user = await User.findById(req.params._id);

  if(!user){
    return res.send("Could'nt read user!");
  }

  let sortedExercises = user.exercises.filter(value => { 
    let temp = new Date(value.date);
    return (!from || temp >= from) && (!to || temp <= to);
  }).slice(0,limit);


  res.json({
    "_id": user._id,
    "username": user.username,
    "count": user.exercises.length,
    "log": sortedExercises
  })
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
