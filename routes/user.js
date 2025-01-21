import express from "express";
import User from "../models/user.js";
import autheUser from "./../middleware/authUser.js";

const router = express.Router()

const users = [{
    userName: "Afzal",
    email: "afzal@gmail.com",
    age: 23,
    id: 1,
},
{
    userName: "Saad",
    email: "saad@gmail.com",
    age: 21,
    id: 2,
}]


router.get(`/` , async (req , res) => {
    try {
        const users = await User.find(); 

        res.status(200).json({
            msg: "Users retrieved successfully",
            error: false,
            data: users,
        });
    } catch (error) {
        res.status(500).json({
            msg: "Error retrieving users",
            error: true,
            message: error.message,
        });
    }
})

router.get(`/myInfo` , autheUser , async (req , res) => {
    try {
        // const users = await User.find(); 
        res.status(200).json({
            msg: "Users retrieved successfully",
            error: false,
            data: req.user,
        });
    } catch (error) {
        res.status(500).json({
            msg: "Error retrieving users",
            error: true,
            message: error.message,
        });
    }
})

router.get('/:id' , async (req , res) => {
    console.log("Request received for ID:", req.params.id);
    // const user = users.find((data) => data.id == req.params.id)
    try{
        const user = await User.findById(req.params.id)

        if (!user) return res.status(404).json({
            msg: "user not found",
            errro: true,
            data: null,
        })
    
        res.status(200).json({
            msg: "User found successfully",
            error: false,
            data: user
        })

    } catch(error) {
        res.status(500).json({
            error: true,
            msg: "Something went wrong",
            data: null
        })
    }
    
})

router.post(`/` , async (req ,res) => {
    const { userName , email } = req.body;
    let newUser = new User({
        userName,
        email,
    })
    newUser = await newUser.save()
    // users.push({
    //     userName,
    //     email,
    //     id: users.length + 1
    // })
    res.status(201).json({
        msg: "User added successfully",
        error: false,
        data: newUser
    })
})

router.put('/:id', async (req, res) => {
    const { userName , email } = req.body
    // const user = User.find((data) => data.id == req.params.id)
    const user = await User.findById(req.params.id)

    if (!user) return res.status(404).json({
        error: true,
        msg: "User not found",
        data: null
    })
    if (userName) user.userName = userName
    if (email) user.email = email

    await user.save();

    res.status(200).json({
        msg: "User found successfully",
        error: false,
        data: user
    })
})

export default router;