const Review = require('../models/Review');
const Product = require('../models/Product');
const { StatusCodes } = require('http-status-codes');
const CustomError = require('../errors');
const { checkPermissions } = require('../utils');

const createReview = async (req, res) => {
  //in req.body (f.ex. on the frontend) we MUST PROVIDE which product we are requesting- "product": "647e247e69c32ece45e23978",
  const { product: productId } = req.body; //check /look for the product in req.body and assign it to productId // in postman in REQUEST { product: productId } : {"product": "647e247e69c32ece45e23978"}
  //check if product exists in db
  const isValidProduct = await Product.findOne({ _id: productId });
  if (!isValidProduct) {
    throw new CustomError.NotFoundError(`No product with id : ${productId}`);
  }
  //check if there is already review for this product
  const alreadySubmitted = await Review.findOne({
    product: productId,
    user: req.user.userId,
  });

  if (alreadySubmitted) {
    throw new CustomError.BadRequestError(
      'Already submitted review for this product'
    );
  }
  req.body.user = req.user.userId; //attach user property (set it equal to req.user.userId) onto req.body ;  req.user.userId came from req.user = { name, userId, role, exp }; //from the object we pass to the browser with name, userId role, exp- check authentication.js line 14 // so we are able to see in postman which user makes this post request- "user": "647dcc11ffdc226f332b7847"
  const review = await Review.create(req.body);
  res.status(StatusCodes.CREATED).json({ review });
};

const getAllReviews = async (req, res) => {
  const reviews = await Review.find({}).populate({
    //adding more info to the review using populate method- aka fill , add the info from mongoose model
    path: 'product', //we pass what we want to reference //line 23 in Review.js
    select: 'name company price', //and what properties we want to get from product model
  });
  // .populate({
  //   path: 'user', //line 28 in Review.js
  //   select: 'name ',//and what properties we want to get from user model
  // });
  res.status(StatusCodes.OK).json({ reviews, count: reviews.length });
};

const getSingleReview = async (req, res) => {
  const { id: reviewId } = req.params; //using object destructuring to extract the id property from the params object of the req (request) object and assign it to the reviewId variable.
  const review = await Review.findOne({ _id: reviewId }); //look for specific review match between id in url and _id in db
  //   .populate({ //also can be applied here
  //     path: 'product',
  //     select: 'name company price',
  //   });
  //check if there is no review- throw an error
  if (!review) {
    throw new CustomError.NotFoundError(`No review with id ${reviewId}`);
  }

  res.status(StatusCodes.OK).json({ review });
};

const updateReview = async (req, res) => {
  //OPTION 1
//   const { id: reviewId } = req.params; //using object destructuring to extract the id property from the params object of the req (request) object and assign it to the reviewId variable.
// //const { rating, title, comment } = req.body; //getting access to rating, title, comment from req,body (from frontend)

// const review = await Review.findOne({ _id: reviewId }); //look for specific review match between id in url and _id in db
//   //console.log(review);
// const rating = req.body.hasOwnProperty('rating') ? req.body.rating  :review.rating
// const title = req.body.hasOwnProperty('title') ? req.body.title  :review.title
// const comment = req.body.hasOwnProperty('comment') ? req.body.comment  :review.comment

//   //check if there is no review- throw an error
//   if (!review) {
//     throw new CustomError.NotFoundError(`No review with id ${reviewId}`);
//   }
//   checkPermissions(req.user, review.user); //see explanation below in deleteReview
//   review.rating = rating;
//   review.title = title;
//   review.comment = comment;
//   await review.save();
//   res.status(StatusCodes.OK).json({ review });

//OPTION 2
  const { id: reviewId } = req.params; //TAKE ID FROM REQ.PARAMS AND ASSIGN IT TO REVIEWiD
  const { rating, title, comment } = req.body; // don't need this
  const review = await Review.findOne({ _id: reviewId });

  if (!review) {
    throw new CustomError.NotFoundError(`No review with id ${reviewId}`);
  }

  checkPermissions(req.user, review.user);
// can simplify with: review.rating = req.body?.rating || review.rating (but hasOwnProperty is better because then that allows us to send/unset values like this: {rating: null})
  review.rating = req.body.hasOwnProperty('rating')
    ? req.body.rating
    : review.rating;
  review.title = req.body.hasOwnProperty('title')
    ? req.body.title
    : review.title;
  review.comment = req.body.hasOwnProperty('comment')
    ? req.body.comment
    : review.comment;

  await review.save();
  res.status(StatusCodes.OK).json({ review });

//option 3
//When we do the object destructuring (const { rating, title, comment } = req.body;), then any fields that didn't exist in req.body will just be saved to the variables on the left-hand-side as undefined.
// const { rating, title, comment } = req.body;
// const review = await Review.findOne({ _id: reviewId });

// if (!review) {
//   throw new CustomError.NotFoundError(`No review with id ${reviewId}`);
// }

// checkPermissions(req.user, review.user);

// // Assign values from request to the review; fall back to the existing values if the request did not provide such a value
// review.rating = rating || review.rating;
// review.title = title || review.title;
// review.comment = comment || review.comment;

// await review.save();
// res.status(StatusCodes.OK).json({ review });
//This says update the review.rating field to the rating variable OR if that's undefined/null, then to the existing review.rating value. 

//option 4 
// const { rating, title, comment } = req.body;
// const review = await Review.findOne({ _id: reviewId });

// if (!review) {
//   throw new CustomError.NotFoundError(`No review with id ${reviewId}`);
// }

// checkPermissions(req.user, review.user);

// // Only assign updated values if they were given in the request:
// if (rating) { review.rating = rating }
// if (title) { review.title = title }
// if (comment) { review.comment = comment }

// await review.save();
// res.status(StatusCodes.OK).json({ review });

};


const deleteReview = async (req, res) => {
  const { id: reviewId } = req.params; //using object destructuring to extract the id property from the params object of the req (request) object and assign it to the reviewId variable.
  const review = await Review.findOne({ _id: reviewId }); //look for specific review match between id in url and _id in db
  //check if there is no review- throw an error
  if (!review) {
    throw new CustomError.NotFoundError(`No review with id ${reviewId}`);
  }
  //only admin and user that created this post can delete it -see this fn in  checkPermissions.js
  //console.log(review);// logs the whole  review object
  //console.log(review.user);// logs user property of the  review object (see Schema Review.js line 21-  type: mongoose.Schema.ObjectId, and it logs in the console : new ObjectId("647dcc71ffdc226f332b784e") )
  checkPermissions(req.user, review.user); //here we pass  parameters (requestUser, resourceUserId) = (who is doing actual request -here req.user, then we compare it with the id of the user that created this review
  await review.remove();
  res.status(StatusCodes.OK).json({ msg: 'Success! Review removed' });
};

////GET REVIEWS FOR SINGLE PRODUCT- OPTION 2 (need access to Review model-line 1)// option 3 do the same in productController
// const getSingleProductReviews = async (req, res) => {
//   const { id: productId } = req.params; // get id from req.params and assign it to productId
//   const reviews = await Review.find({ product: productId }); // look in Review model match between productId and product property in Review model
//   res.status(StatusCodes.OK).json({ reviews, count: reviews.length });
// };  here line 103+ productRoute.js lines 17, 34. the difference from mongoose virtals is that here we can set p the queries we want -line 93 bcs we have access to the model, in virtuals we can´t

module.exports = {
  createReview,
  getAllReviews,
  getSingleReview,
  updateReview,
  deleteReview,
 // getSingleProductReviews,
};
