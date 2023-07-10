const mongoose = require('mongoose');

const ReviewSchema = mongoose.Schema(
  {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'Please provide rating'],
    },
    title: {
      type: String,
      trim: true,
      required: [true, 'Please provide review title'],
      maxlength: 100,
    },
    comment: {
      type: String,
      required: [true, 'Please provide review text'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    product: {
      type: mongoose.Schema.ObjectId,
      ref: 'Product',
      required: true,
    },
  },
  { timestamps: true }
);

// user only can leave one review per product
ReviewSchema.index({ product: 1, user: 1 }, { unique: true }); // we want to have a compound index, meaning a index that entails multiple fields (in this case product and user)
//{ product: 1, user: 1 } is an object representing the fields to be indexed. In this case, the index is created on the product and user fields of the Review model.
//By setting unique to true, it ensures that the combination of product and user values in the Review collection is unique. This means that each combination of product and user can only appear once, preventing duplicate reviews for the same product by the same user

//calculate the average rating and the number of reviews for a specific product and update the corresponding Product document
//here we call calculateAverageRating (static method) on Schema using .statics // with .methods we call erth on instance -see comparePassword in User Schema)
ReviewSchema.statics.calculateAverageRating = async function (productId) {
  const result = await this.aggregate([ //aggregation operation on the Review collection. we create aggregation pipeline that consists of 2 stages.
    { $match: { product: productId } }, //1stage Match reviews with the specified productId
    {
      $group: { //2 stage- Groups the matched reviews together - this is what we return
        // lines 48-50: !!! When using the $group aggregator, the _id field tells Mongo what to group the results by. If we pass in null or a constant value (like 1), it will just group all the results together. In this case, we've already filtered the results in the first aggregate step to give us just the reviews for a particualr product; we're then grouping together all of those reviews, and doing some calculations / "aggregations" on those groups (to get the average rating and number of reviews).
        _id: null, //  id of the group- can be product id, rating, etc //we use null or _id: '$product' // but  if we want to calculate how many reviews we have with specific rating for this product: _id : '$rating'  //check syntax  + add: ,amount:{$sum:1}- see code below line 81
        averageRating: { $avg: '$rating' }, // Calculate average rating  using the $avg aggregation operator. 
        numOfReviews: { $sum: 1 }, // Count the number of reviews using the $sum aggregation operator.
      },
    }, 
  ]);
  console.log(result); // test review requests in postman IMPORTANT!!- here we already have results calculated, now we will update Product.js with this data:
  try { //static method calculateAverageRating updates the  Product.js (with the specified productId)  with the calculated values. 
    await this.model('Product').findOneAndUpdate(
      { _id: productId }, // Find the product with the specified productId
      {
        averageRating: Math.ceil(result[0]?.averageRating || 0), // Update averageRating field/ sets the averageRating field to the rounded average rating value from the aggregation result (result[0]?.averageRating). result[0]?.averageRating: This part accesses the averageRating property of the first element (result[0]) in the result array. The ?. optional chaining operator is used to prevent a runtime error if result[0] is undefined or null. If averageRating exists, it will be used for further calculations. if not it will be set to 0
        numOfReviews: result[0]?.numOfReviews || 0, // Update numOfReviews field/ sets the averageRating field to the rounded average rating value from the aggregation result (result[0]?.averageRating)
      }
    );
  } catch (error) {
    console.log(error);
  }
};


//1 OPTION
//post save hook called- on save()
ReviewSchema.post('save', async function () {
  // we are calling the static method calculateAverageRating that schema has:
  await this.constructor.calculateAverageRating(this.product); //with this. we access actual schema
});

//post remove hook called- on remove()
ReviewSchema.post('remove', async function () {
  await this.constructor.calculateAverageRating(this.product); // we are pointing product id in schema, called product- see line 26
});

module.exports = mongoose.model('Review', ReviewSchema);



//2 OPTION // but mongoose can complain bcs he doesn’t like it if we define middleware after defining the model
// const ReviewModel = mongoose.model('Review', ReviewSchema);

// ReviewSchema.post('save', async function () {
//   await ReviewModel.calculateAverageRating(this.product); //with this. we access actual schema // AKOSREVIEW this == this instance
// });


// ReviewSchema.post('remove', async function () {
//   await ReviewModel.calculateAverageRating(this.product); // we are pointing product id in schema, called product- see line 26
// });

// module.exports = ReviewModel





//lines 45-51- if we want  to calculate how many reviews we have with specific rating for this product
// {
//   $group: { 
//     _id: '$rating', // this is id of the group- we group by rating 
//     amount:{$sum:1}
//   },
// },