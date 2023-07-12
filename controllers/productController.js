const Product = require('../models/Product');
const { StatusCodes } = require('http-status-codes');
const CustomError = require('../errors');
const path = require('path');

const createProduct = async (req, res) => {
  req.body.user = req.user.userId; // req.body.user - user is required to be provided (see Product.js line 58) and is set to req.user.userId
  const product = await Product.create(req.body); //in req.body come all the data from the frontend
  res.status(StatusCodes.CREATED).json({ product });
  //we want to attach user from ProductSchema to identify WHO is trying to create a products , and if it´s an admin- allow him to do it
};

const getAllProducts = async (req, res) => {
  const products = await Product.find({});
  res.status(StatusCodes.OK).json({ products, count: products.length });
};
//GET REVIEWS FOR SINGLE PRODUCT- OPTION 1
//mongoose virtuals to get all the reviews for this product
const getSingleProduct = async (req, res) => {
  //id of the product is located in req.params
  const { id: productId } = req.params; //This extracts the id parameter from the request's URL parameters and assigns it to the productId variable.
  const product = await Product.findOne({ _id: productId }) // find a product in the database with the specified _id that matches productId or id from req.params
    .populate('reviews'); //get all reviews for this product using virtual field reviews - set in Product.js line 70
  if (!product) {
    throw new CustomError.NotFoundError(`No product with id ${productId}`);
  }
  res.status(StatusCodes.OK).json({ product });
};
const updateProduct = async (req, res) => {
  const { id: productId } = req.params; // id from req.params is assigned to productId
  const product = await Product.findOneAndUpdate({ _id: productId }, req.body, {
    new: true,
    runValidators: true,
  });
  if (!product) {
    throw new CustomError.NotFoundError(`No product with id ${productId}`);
  }
  res.status(StatusCodes.OK).json({ product });
};

const deleteProduct = async (req, res) => {
  const { id: productId } = req.params; // we took id from req.params and assigned it to productId
  const product = await Product.findOne({ _id: productId }); //looking match between _id in db and productId see previous line
  if (!product) {
    throw new CustomError.NotFoundError(`No product with id ${productId}`);
  }
  await product.remove(); // we use remove bsc it triggers pre hook- line 79 Product.js
  res.status(StatusCodes.OK).json({ msg: 'Success! Product removed!' });
};
const uploadImage = async (req, res) => {
  // console.log(req.files);
  if (!req.files) {
    throw new CustomError.BadRequestError('No file uploaded');
  }
  //in req.files we have image property, we assign it to a const productImage
  const productImage = req.files.image;
  if (!req.files.image || !productImage.mimetype.startsWith('image')) {
    throw new CustomError.BadRequestError('Please upload image');
  }

  const maxSize = 1024 * 1024;

  if (productImage.size > maxSize) {
    throw new CustomError.BadRequestError(
      'Please upload image smaller than 1MB'
    );
  }
  //make sure that directory exists:
const uploadsFolder = path.join(__dirname, '../public/uploads');
  if (!existsSync(uploadsFolder)) {
    mkdirSync(uploadsFolder);
  }

  const imagePath = path.join(uploadsFolder, productImage.name);
//or:  
//  const imagePath = path.join(
  //  __dirname,
  //  '../public/uploads/' + `${productImage.name}`
  //);
  await productImage.mv(imagePath);
  res.status(StatusCodes.OK).json({ image: `https://ecommerce-6kwa.onrender.com/uploads/${productImage.name}` });
  //res.status(StatusCodes.OK).json({ image: `/uploads/${productImage.name}` });
};

module.exports = {
  createProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  uploadImage,
};

//working code
// const uploadImage = async (req, res) => {
//   // console.log(req.files);
//   if (!req.files) {
//     throw new CustomError.BadRequestError('No file uploaded');
//   }
//   //in req.files we have image property, we assign it to a const productImage
//   const productImage = req.files.image;
//   if (!req.files.image || !productImage.mimetype.startsWith('image')) {
//     throw new CustomError.BadRequestError('Please upload image');
//   }

//   const maxSize = 1024 * 1024;

//   if (productImage.size > maxSize) {
//     throw new CustomError.BadRequestError(
//       'Please upload image smaller than 1MB'
//     );
//   }

//   const imagePath = path.join(
//     __dirname,
//     '../public/uploads/' + `${productImage.name}`
//   );
//   await productImage.mv(imagePath);
//   res.status(StatusCodes.OK).json({ image: `/uploads/${productImage.name}` });
// };
