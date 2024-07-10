const express = require('express')
const bodyParser = require("body-parser");
const cors = require('cors')
const mongoose = require('mongoose');
require('dotenv').config()

const User = require('./models/user.model');
const Exercise = require('./models/exercise.model');

const app = express()

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', async (req, res, next) => {
  const users = await User.find();

  res.status(200).json([...users]);
})

app.post('/api/users', async (req, res, next) => {
  const username = req.body.username;
  const user = new User({ username });

  const savedUser = await user.save();

  res.status(201).json({ ...savedUser._doc });
});

app.post('/api/users/:id/exercises', async (req, res, next) => {
  const user = await User.findById(req.params.id);
  const exercise = new Exercise({
    description: req.body.description,
    duration: req.body.duration,
    date: req.body.date ? req.body.date : new Date().toDateString(),
    userId: user
  });

  const savedExercise = await exercise.save();

  const response = {
    _id: savedExercise._id,
    username: user.username,
    description: savedExercise.description,
    duration: savedExercise.duration,
    date: savedExercise.date
  };

  res.status(201).json(response);
})

app.get('/api/users/:id/logs', async (req, res, next) => {
  const user = await User.findById(req.params.id);
  const limit = req.query.limit || '';
  const fromDate = req.query.from || '';
  const toDate = req.query.to || '';

  const formattedStartDate = fromDate ?? new Date(fromDate).toDateString();
  const formattedEndDate = toDate ?? new Date(toDate).toDateString();

  const query = {
    userId: user._id,
    ...( formattedStartDate || formattedEndDate ? {
      date: {
        $gte: formattedStartDate,
        $lte: formattedEndDate
      }
    } : {})
  };

  const exercises = await Exercise.find(query).limit(limit).select(('-userId -_id'));
  const count = exercises.length;

  res.status(200).json({ count, ...user._doc, log: exercises });
})

let listener;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    listener = app.listen(process.env.PORT || 3000, () => {
      console.log('Your app is listening on port ' + listener.address().port)
    })
  })
  .catch(error => console.log(error));

