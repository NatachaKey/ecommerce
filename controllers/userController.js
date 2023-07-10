const User = require('../models/User');
const { StatusCodes } = require('http-status-codes');
const CustomError = require('../errors');
const { createTokenUser, attachCookiesToResponse, checkPermissions } = require('../utils');

// only admins should be able to see all users + we remove password from the response
const getAllUsers = async (req, res) => {
  console.log(req.user); //we pass to the browser object with name, userId ad role - check authentication.js line 13
  const users = await User.find({ role: 'user' }).select('-password');
  res.status(StatusCodes.OK).json({ users });
};


const getSingleUser = async (req, res) => {
    const user = await User.findOne({ _id: req.params.id }).select('-password');
    if (!user) {
      throw new CustomError.NotFoundError(`No user with id : ${req.params.id}`);
    }
    // could checkpermissions be a middleware insetead?
    checkPermissions(req.user, user._id) //we pass user object that is in the request and id property  in a database of the user we are requesting - see line 15
    res.status(StatusCodes.OK).json({ user });
  };


const showCurrentUser = async (req, res) => {
  //set up user objest and set it eql to req.user
  //here we dont query database, we are getting user we placed in token
  console.log(req.user);
  
  res.status(StatusCodes.OK).json({ user: req.user });
};

//option 1 -update user with user.save()

const updateUser = async (req, res) => {
  const { email, name } = req.body; // we are looking for name, email in req.body
  if (!email && !name) {
    throw new CustomError.BadRequestError('Please provide all values');
  }

  const user = await User.findOne({ _id: req.user.userId }); //get user
  // Will this set email/name to undefined if tehy weren't given?
  user.email = email; //update properties manually 
  user.name = name;

  await user.save(); // using pre save hook (see user model) to save updated user
  //BUT when we invoke the hook- we hash the password one more time - and we get in    console.log('hey there') or console.log(this.modifiedPaths());; -line 35 user model

  //create tokenUser with data updated
  const tokenUser = createTokenUser(user);
  attachCookiesToResponse({ res, user: tokenUser });
  res.status(StatusCodes.OK).json({ user: tokenUser });
};

//option 2 update user with findOneAndUpdate

// const updateUser = async (req, res) => {
//   const { email, name } = req.body; // we are looking for name, email in req.body
//   if (!email || !name) {
//     throw new CustomError.BadRequestError('Please provide all values');
//   }
//   const user = await User.findOneAndUpdate(
//     { _id: req.user.userId }, //The first parameter of findOneAndUpdate specifies the query to find the document to be updated
//     { email, name },//specifies the fields and their new values to be updated in the matched document, here it updates the email and name fields with the corresponding variables email and name.
//     { new: true, runValidators: true }// new: true ensures that the updated document is returned as the result of the operation. runValidators: true instructs Mongoose to run the defined schema validators on the updated fields.
//   );
//   //create tokenUser with data updated
//   const tokenUser = createTokenUser(user);
//   attachCookiesToResponse({ res, user: tokenUser });
//   res.status(StatusCodes.OK).json({ user: tokenUser });
// };

const updateUserPassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    throw new CustomError.BadRequestError('Please provide both values');
  }
  // find _id in db and compare it with thre received from req.user (req.user.userId)
  const user = await User.findOne({ _id: req.user.userId });
  const isPasswordCorrect = await user.comparePassword(oldPassword); // comparePassword - custom method created in User model line 39 user.js
  if (!isPasswordCorrect) {
    throw new CustomError.UnauthenticatedError('Invalid credentials');
  }
  // if we pass all of these two checks above, we save the password
  user.password = newPassword;
  await user.save(); // invokes .pre 'save' hook , line 34 user model
  res.status(StatusCodes.OK).json({ msg: 'Success! Password updated!' });
};

module.exports = {
  getAllUsers,
  getSingleUser,
  showCurrentUser,
  updateUser,
  updateUserPassword,
};
