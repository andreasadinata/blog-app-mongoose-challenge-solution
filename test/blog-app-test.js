//list out things that we need
const chai = require('chai');
const chaiHTTP = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');
const should = chai.should();
const {
    BlogPost
} = require('../models');
const {
    app, runServer, closeServer
} = require('../server');
const {
    TEST_DATABASE_URL
} = require('../config');
chai.use(chaiHTTP);

//start with faker to create a random data that we can use to test
function seedBlogPostData() {
    console.info('seeding the database')
    const seedData = [];
    for (let i = 1; i <= 10; i++) {
        seedData.push(generateData())
    }
    return BlogPost.insertMany(seedData);
}

function generateData() {
    data = {
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        },
        title: faker.lorem.sentence(),
        content: faker.lorem.text()
    };
    return data;
}

//reset function
function tearDownDb() {
    console.warn('Deleting Database');
  return mongoose.connection.dropDatabase();
  /*
  return new Promise((resolve, reject) => {
  console.warn('Deleting database');
  mongoose.connection.dropDatabase()
    .then(result => resolve(result))
    .catch(err => reject(err))
  });
    */
}

describe('Blog Posts API resource', function () {
    //instruction before everything start to make sure
    //before and after steps
    before(function () {
        return runServer(TEST_DATABASE_URL);
    });
    beforeEach(function () {
        return seedBlogPostData();
    });
    afterEach(function () {
        return tearDownDb();
    });
    after(function () {
        return closeServer();
    });
    //main part of the test
    //start with get
    describe('test GET endpoint', function () {
        it('should list all the data', function () {
            let res; //what is let res? state a variable without defining its value?
            return chai.request(app)
                .get('/posts')
                .then(function (_res) {
                    res = _res; //ask marius what is this?
                    res.should.have.status(200); //essential question
                    res.body.should.have.length.of.at.least(1);
                    return BlogPost.count(); // ask marius about count
                })
                .then(count => {
                    res.body.should.have.length.of(count);
                });
        });
        it('should return the right fields as requested', function () {
            let resPost;
            return chai.request(app)
                .get('/posts')
                .then(function (res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.a('array');
                    res.body.should.have.length.of.at.least(1);
                    res.body.forEach(function (post) {
                        post.should.be.a('object');
                        post.should.include.keys('id', 'title', 'content', 'author', 'created');
                    });
                    resPost = res.body[0];
                    return BlogPost.findById(resPost.id).exec(); // ask marius about this
                })
                .then(post => {
                    resPost.title.should.equal(post.title);
                    resPost.content.should.equal(post.content);
                    resPost.author.should.equal(post.authorName);
                });
        });
    });
    describe('Test POST endpoint', function () {
        it('should add new blog post', function () {
            const newPost = generateData();
            return chai.request(app)
                .post('/posts')
                .send(newPost)
                .then(function (res) { //ask marius the process of first and second then
                    res.should.have.status(201);
                    res.should.be.json;
                    res.body.should.be.a('object');
                    res.body.should.include.keys(
                        'id', 'title', 'content', 'author', 'created');
                    res.body.title.should.equal(newPost.title);
                    // cause Mongo should have created id on insertion
                    res.body.id.should.not.be.null;
                    res.body.author.should.equal(
                        `${newPost.author.firstName} ${newPost.author.lastName}`);
                    res.body.content.should.equal(newPost.content);
                    return BlogPost.findById(res.body.id).exec(); //?
                })
                .then(function (post) { //what makes these two functions are different?
                    post.title.should.equal(newPost.title);
                    post.content.should.equal(newPost.content);
                    post.author.firstName.should.equal(newPost.author.firstName);
                    post.author.lastName.should.equal(newPost.author.lastName);
                })
        });
    });
    describe('Test PUT endpoint', function () {
        it('should update fields which are being sent', function () {
            const updateData = {
                title: 'cats cats cats',
                content: 'dogs dogs dogs',
                author: {
                    firstName: 'foo',
                    lastName: 'bar'
                }
            }
            return BlogPost.findOne()
                .exec()
                .then(post => {
                    updateData.id = post.id;
                    return chai.request(app)
                        .put(`/posts/${post.id}`)
                        .send(updateData);
                })
                .then(res => {
                    res.should.have.status(201);
                    res.should.be.json;
                    res.body.should.be.a('object');
                    res.body.title.should.equal(updateData.title);
                    res.body.author.should.equal(
                        `${updateData.author.firstName} ${updateData.author.lastName}`);
                    res.body.content.should.equal(updateData.content);
                    return BlogPost.findById(res.body.id).exec();
                })
                .then(post => {
                    post.title.should.equal(updateData.title);
                    post.content.should.equal(updateData.content);
                    post.author.firstName.should.equal(updateData.author.firstName);
                    post.author.lastName.should.equal(updateData.author.lastName);
                });
        });
    });
    describe('Check Delete endpoint', function () {
        it('should delete a post based on the id', function () {
            let post;
            return BlogPost.findOne().exec()
                .then(_post => {
                    post = _post;
                    return chai.request(app).delete(`/posts/${post.id}`);
                })
                .then(res => {
                    res.should.have.status(204);
                    return BlogPost.findById(post.id);
                });
        });
    });
});
