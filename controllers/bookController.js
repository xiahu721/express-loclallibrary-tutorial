var Book = require('../models/book');
var BookInstance = require('../models/bookinstance');
var async = require('async');
const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');
var Author = require('../models/author');
var Genre = require('../models/genre');

// Display list of all books.
exports.book_list = function (req, res, next) {
    // res.send('NOT IMPLEMENTED: Book list');
    Book.find({}, 'title author')
        .populate('author')
        .exec((err, list_books) => {
            if (err) { return next(err); }
            res.render('book_list', { title: "Book List", book_list: list_books });
        });
};

// Display detail page for a specific book.
exports.book_detail = function (req, res, next) {
    // res.send('NOT IMPLEMENTED: Book detail: ' + req.params.id);
    async.parallel({
        book: function (callback) {
            Book.findById(req.params.id)
                .populate('author')
                .populate('genre')
                .exec(callback);
        },
        book_instances: function (callback) {
            BookInstance.find({ 'book': req.params.id })
                .exec(callback);
        },

    }, function (err, results) {
        if (err) { return next(err); }
        if (results.book == null) { // No results.
            var err = new Error('Book not found');
            err.status = 404;
            return next(err);
        }
        // Successful, so render
        res.render('book_detail', { title: 'Book Detail', book: results.book, book_instances: results.book_instances });
    });
};

// Display book create form on GET.
exports.book_create_get = function (req, res, next) {

    // Get all authors and genres, which we can use for adding to our book.
    async.parallel({
        authors: function (callback) {
            Author.find(callback);
        },
        genres: function (callback) {
            Genre.find(callback);
        },
    }, function (err, results) {
        if (err) { return next(err); }
        res.render('book_form', { title: 'Create Book', authors: results.authors, genres: results.genres });
    });

};

// Handle book create on POST.
exports.book_create_post = [
    // Convert the genre to an array.
    (req, res, next) => {
        if (!(req.body.genre instanceof Array)) {
            if (typeof req.body.genre === 'undefined')
                req.body.genre = [];
            else
                req.body.genre = new Array(req.body.genre);
        }
        next();
    },

    // Validate fields.
    body('title', 'Title must not be empty.').isLength({ min: 1 }).trim(),
    body('author', 'Author must not be empty.').isLength({ min: 1 }).trim(),
    body('summary', 'Summary must not be empty.').isLength({ min: 1 }).trim(),
    body('isbn', 'ISBN must not be empty').isLength({ min: 1 }).trim(),

    // Sanitize fields (using wildcard).
    sanitizeBody('*').trim().escape(),

    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a Book object with escaped and trimmed data.
        var book = new Book(
            {
                title: req.body.title,
                author: req.body.author,
                summary: req.body.summary,
                isbn: req.body.isbn,
                genre: req.body.genre
            });

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/error messages.

            // Get all authors and genres for form.
            async.parallel({
                authors: function (callback) {
                    Author.find(callback);
                },
                genres: function (callback) {
                    Genre.find(callback);
                },
            }, function (err, results) {
                if (err) { return next(err); }

                // Mark our selected genres as checked.
                for (let i = 0; i < results.genres.length; i++) {
                    if (book.genre.indexOf(results.genres[i]._id) > -1) {
                        results.genres[i].checked = true;
                    }
                }
                res.render('book_form', { title: 'Create Book', authors: results.authors, genres: results.genres, book: book, errors: errors.array() });
                // return;
            });
        }
        else {
            // Data from form is valid. Save book.
            book.save(function (err) {
                if (err) { return next(err); }
                //successful - redirect to new book record.
                res.redirect(book.url);
            });
        }
    }
];

// Display book delete form on GET.
exports.book_delete_get = function (req, res, next) {
    // res.send('NOT IMPLEMENTED: Book delete GET');
    async.parallel({
        book: function (callback) {
            Book.findById(req.params.id)
                .populate('author')
                .populate('genre')
                .exec(callback);
        },
        book_bookinstances: function (callback) {
            BookInstance.find({ 'book': req.params.id })
                .exec(callback);
        },

    }, function (err, results) {
        if (err) { return next(err); }
        if (results.book == null) { // No results.
            res.redirect('/calatog/books');
        }
        // Successful, so render
        res.render('book_delete', { title: 'Delete Book', book: results.book, book_bookinstances: results.book_bookinstances });
    });

};

// Handle book delete on POST.
exports.book_delete_post = function (req, res, next) {
    // res.send('NOT IMPLEMENTED: Book delete POST');
    async.parallel({
        book: function (callback) {
            Book.findById(req.body.bookid).exec(callback)
        },
        book_bookinstances: function (callback) {
            BookInstance.find({ 'book': req.body.bookid }).exec(callback)
        },
    }, function (err, results) {
        if (err) { return next(err); }
        // Success
        if (results.book_bookinstances.length > 0) {
            // Book has bookinstances. Render in same way as for GET route.
            res.render('book_delete', { title: 'Delete Book', book: results.book, book_bookinstances: results.book_bookinstances });
            return;
        }
        else {
            // Book has no bookinnstances. Delete object and redirect to the list of books.
            Book.findByIdAndRemove(req.body.bookid, function (err) {
                if (err) { return next(err); }
                // Success - go to book list
                res.redirect('/catalog/books')
            })
        }
    });
};

// Display book update form on GET.
exports.book_update_get = function (req, res, next) {
    // res.send('NOT IMPLEMENTED: Book update GET');
    async.parallel({
        book: function (callback) {
            Book.findById(req.params.id)
                .populate('author')
                .populate('genre')
                .exec(callback);
        },
        authors: function (callback) {
            Author.find(callback);
        },
        genres: function (callback) {
            Genre.find(callback);
        },
    }, function (err, results) {
        if (err) { return next(err); }
        if (results.book == null) { // No results
            var err = new Error('Book not found');
            err.status = 404;
            return next(err);
        }
        // Mark our selected genres as checked.
        for (let i = 0; i < results.genres.length; i++) {
            for (let j = 0; j < results.book.genre.length; j++) {
                if (results.genres[i]._id.toString()==results.book.genre[j]._id.toString()) {
                    results.genres[i].checked = true;
                    break;
                }
            }
        }
        res.render('book_form', { title: 'Update Book', book: results.book, authors: results.authors, genres: results.genres });
    });
};

// Handle book update on POST.
exports.book_update_post = [
    // Convert the genre to an array.
    (req, res, next) => {
        if (!(req.body.genre instanceof Array)) {
            if (typeof req.body.genre === 'undefined')
                req.body.genre = [];
            else
                req.body.genre = new Array(req.body.genre);
        }
        next();
    },

    // Validate fields.
    body('title', 'Title must not be empty.').isLength({ min: 1 }).trim(),
    body('author', 'Author must not be empty.').isLength({ min: 1 }).trim(),
    body('summary', 'Summary must not be empty.').isLength({ min: 1 }).trim(),
    body('isbn', 'ISBN must not be empty').isLength({ min: 1 }).trim(),

    // Sanitize fields (using wildcard).
    sanitizeBody('*').trim().escape(),

    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a Book object with escaped and trimmed data.
        var book = new Book(
            {
                title: req.body.title,
                author: req.body.author,
                summary: req.body.summary,
                isbn: req.body.isbn,
                genre: req.body.genre,
                _id: req.params.id
            });

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/error messages.

            // Get all authors and genres for form.
            async.parallel({
                authors: function (callback) {
                    Author.find(callback);
                },
                genres: function (callback) {
                    Genre.find(callback);
                },
            }, function (err, results) {
                if (err) { return next(err); }

                // // Mark our selected genres as checked.
                // for (let i = 0; i < results.genres.length; i++) {
                //     if (book.genre.indexOf(results.genres[i]._id) > -1) {
                //         results.genres[i].checked = 'true';
                //     }
                // }
                res.render('book_form', { title: 'Update Book', authors: results.authors, genres: results.genres, book: book, errors: errors.array() });
                return;
            });
        }
        else {
            // Data from form is valid.  Update the record.
            Book.findByIdAndUpdate(req.params.id, book, {}, function (err, updatedbook) {
                if (err) { return next(err); }
                //successful - redirect to new book record.
                res.redirect(updatedbook.url);
            });
        }
    }
];