const crypto = require('crypto');
const {promisify} = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const sendEmail = require('./../utils/email');


const signToken = id =>{
    return jwt.sign({id}, process.env.JWT_SECRET, {
        expiresIn:"90d"
    });
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);

    const cookieOptions = {
        expires: new Date(
            Date.now + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        httpOnly: true
    };

    if(process.env.NODE_ENV === 'production') cookieOptions.secure = true;
            
    res.cookie('jwt', token, cookieOptions);

    user.password = undefined;

    res.status(statusCode).json({
        status: 'sucess',
        token,
        data: {
            user
        }
    });
}

exports.signup = catchAsync(async (req, res, next) =>{
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        role: req.body.role
    });

    createSendToken(newUser, 201, res);
});


exports.login = catchAsync(async(req, res, next) => {
    const {email, password} = req.body;

    if(!email || !password){
        return next(new AppError('Please provide email and password', 400));
    }

    const user = await User.findOne({email}).select('+password');

    if(!user || !(await user.correctPassword(password, user.password))){
        return next(new AppError('Incorrect email or password', 401));
    }

    createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req,res,next) => {
   
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ){
        token = req.headers.authorization.split(' ')[1];
    }
    console.log(token);

    if(!token){
        return next(
            new AppError('You are not logged in! Please log in to get acess.', 401)
        );
    }

    //2) verificar token 
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // checar que o usuario existe
    const currentUser = await User.findById(decoded.id);
    if(!currentUser){
        return next(
            new AppError(
                'The user to this token no longer exists', 
                401
            )
        );
    }

    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(new AppError('User recently changed password. Log in again'), 401)
    };

    req.user = currentUser;
    next();

});

exports.restrictTo = (...roles) =>{
    return (req, res, next) => {
        if(!roles.includes(req.user.role)){
            return next(
                new AppError('You do not have permission to permission to perfim this action', 403)
            );
        }
        next();
    }
}

exports.forgotPassword = catchAsync(async(req, res, next) =>{
    const user = await User.findOne({email: req.body.email});
    if(!user){
        return next(new AppError('there is no user with this email adress',400));
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({validateBeforeSave: false});

    const resetURL = `${req.protocol}://${req.get(
        'host')}
        /api/v1/users/resetPassword/${resetToken}`;

    const message = `Forgot your password? Submit a PATCH request to ${resetURL}`;
    try {
        await sendEmail({
            email: user.email,
            subject: 'Your password reset token',
            message
        });
    
        res.status(200).json({
            status: 'sucess',
            message: 'Token sent to email'
        });

    } catch(err){
        user.PasswordResetToken = undefined;
        user.PasswordResetExpires = undefined;
        await user.save({validadeBeforeSave: false})

        return next(
            new AppError('There was an error sending the email'), 500
        );
    }


});

exports.resetPassword = catchAsync(async(req, res, next) =>{
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex')

    const user = await User.findOne({
        PasswordResetToken: hashedToken, 
        PasswordResetExpires: {$gt: Date.now()}
    });

    if (!user) {
        return next(new AppError('Token is invalid or has expired', 400))
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.PasswordResetToken = undefined;
    user.PasswordResetExpires = undefined;
    await  user.save();

    createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async(req, res, next) => {
    const user = await User.findById(req.user.id).select('+password');

    if(!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
        return next(new AppError('Your current password is wrong', 401))
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    createSendToken(user, 200, res);
});

