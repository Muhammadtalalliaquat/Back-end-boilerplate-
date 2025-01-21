
import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import sendResponse from '../helpers/Response.js';

async function autheUser(req, res, next) {
    try {
        // console.log(`req.headers =>`, req.headers);

        const bearer = req?.headers?.authorization;

        if (!bearer || !bearer.startsWith("Bearer ")) {
            return sendResponse(res, 403, null, true, 'Token not provided or invalid format.');
        }

        const token = bearer.split(" ")[1];

        const decode = jwt.verify(token, process.env.AUTH_SECRET);

        if (decode) {
            const user = await User.findById(decode._id);

            if (user) {
                req.user = user;
                next();
            } else {
                return sendResponse(res, 403, null, true, "User not found.");
            }
        } else {
            return sendResponse(res, 403, null, true, "Invalid token.");
        }
    } catch (error) {
        console.error("Authentication Error:", error.message);
        return sendResponse(res, 401, null, true, "Unauthorized. Invalid token.");
    }
}

export default autheUser;















// import sendResponse from "../helpers/Response.js"
// import jwt from 'jsonwebtoken'
// import User from '../models/user.js'
// import 'dotenv/config'


// async function autheUser(req , res , next){
//     console.log(`req.headers=>  ${res.headers}`)
//     const bearer = req?.headers?.authorization
//     if(!bearer) return sendResponse(res, 403, null, true, 'Token not provided.');
//     const token = bearer.split(" ")[1]

//     const decode = jwt.verify(token, process.env.AUTH_SECRET)
//     if(decode) {
//         const user = await User.findById(decode._id)
//         if(user) {
//             req.user = user
//             next()
//         } else {
//             return sendResponse(res, 403, null, true, "User not Found")
//         }
//     } else {
//         return sendResponse(res, 403, null, true, "Invalid Token")
//     }
// }

// export default autheUser;