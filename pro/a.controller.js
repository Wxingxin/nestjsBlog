const hello = 'hello';

exports.index = (req, res) => {
    res.send(hello);
};

exports.middleware = (req, res, next) => {
    next();
};