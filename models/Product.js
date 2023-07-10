const mongoose = require('mongoose');
const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true, // no whitespaces
      required: [true, 'Please provide product name'],
      maxlength: [100, 'Name can not be more than 100 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Please provide product price'],
      // might be good to have min price validation
    },
    description: {
      type: String,
      required: [true, 'Please provide product description'],
      maxlength: [1000, 'Description can not be more than 1000 characters'],
    },
    image: {
      type: String,
      default: '/uploads/example.jpg',
    },
    category: {
      type: String,
      required: [true, 'Please provide product category'],
      enum: ['necklace', 'earrings', 'ring'],
    },
    company: {
      type: String,
      required: [true, 'Please provide company'],
      enum: {
        values: ['Suarez', 'Tiffany', 'Cartier'],
        message: '{VALUE} is not supported', // we can access the values the user is providing
      },
    },
    featured: {
      type: Boolean,
      default: false,
    },
    freeShipping: {
      type: Boolean,
      default: false,
    },
    inventory: {
      type: Number,
      required: true,
      default: 15, //stock uds
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    numOfReviews: {
      type: Number,
      default: 0,
    },
    user: {
      type: mongoose.Types.ObjectId,
      ref: 'User', // we are referencing the user model . if we don´t provide user- in postman we'll get  "msg": "Path `user` is required."
      required: true,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } } //timestamps provides fields of createdAt , updatedAt... and exact time, //{ toJSON: { virtuals: true }, toObject: { virtuals: true } } is used in Mongoose to enable virtual fields to be included when converting a document to JSON or a plain JavaScript object
);

//this set up helps to get all the reviews about specific product without directly storing them in  Product.js. by ENABLING VIRTUAL FIELDS //see productController.js line 22
// it looks for matches betweeN localField (_id  of the product  in db) and foreignField (line26-27 in Review.js) AND SETS IT AS A VIRTUAL FIELD reviews
ProductSchema.virtual('reviews', {
  // defines a virtual field named reviews in the ProductSchema. A virtual field is not stored in the database but acts as a reference to another model.
  ref: 'Review', //specifies that the virtual field reviews is referencing the Review model.
  localField: '_id', //_id field (from the db= id of the product) of the Product model is used as the local field to establish the relationship.
  foreignField: 'product', // product field in the Review model is used as the foreign field to establish the relationship.
  justOne: false, //multiple reviews can be associated with a single product.
  //match:{rating:1} show only reviews with rating eql to 1 etc.
});

ProductSchema.pre('remove', async function (next) {
  //delete all the reviews  in Review model associated with this particular product
  await this.model('Review').deleteMany({ product: this._id }); // product is the propery of the Review model that references the product : this._id from db - id of THIS document
});

module.exports = mongoose.model('Product', ProductSchema);

//  we use virtual fields in Mongoose to establish a relationship between the Product and Review models.
//with mongoose virtuals we cant specify queries- we will get all the reviews
