import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const generateAccessAndRefreshToken = (user) => {
  const accesToken = jwt.sign(
    { userId: user._id, username: user.username },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "1d" }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, username: user.username },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  return { accesToken, refreshToken };
};

const RegisterUser = async (req, res) => {
  // get user data from request body
  try {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // checking user if already exist
    const isExistingUser = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (isExistingUser)
      return res
        .status(409)
        .json({ message: "User with given username or email already exists" });

    // check the picture of user
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
      return res.status(400).json({ message: "Avatar upload failed" });
    }

    const avatar = await uploadToCloudinary(avatarLocalPath);

    if (!avatar) {
      return res.status(500).json({ message: "Avatar file is required" });
    }

    //hash the [password]
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // create new user
    const newUser = await User.create({
      username,
      password: hashedPassword,
      email,
      avatar: avatar.secure_url, // save the file path
    });

    // Remove password from response
    const updatedUser = await User.findById(newUser._id).select(
      "-password -refreshToken"
    );

    res
      .status(201)
      .json({ user: updatedUser, message: "User registered successfully WoW" });
  } catch (error) {
    return res.status(500).json({
      message: "Registration failed due to server error" + error.message,
    });
  }
};

async function loginUser(req, res) {
  try {
    const { username, password, email } = req.body;
    if ((!username && !email) || !password) {
      return res
        .status(400)
        .json({ message: "Username or Email and Password is required!" });
    }

    const user = await User.findOne({ $or: [{ username }, { email }] });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    //check the password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (isPasswordValid) console.log("Password is valid");
    console.log(user.password, "  ", password);

    if (!isPasswordValid)
      return res
        .status(401)
        .json({ message: "Invalid credentials | incorrect password" });

    const safeUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    // generate JWT token
    const { accesToken, refreshToken } = generateAccessAndRefreshToken(user);

    // store refresh token in database
    user.refreshToken = refreshToken;
    await user.save();

    const options = {
      httpOnly: true,
      secure: true,
    };

    res
      .status(201)
      .cookie("access_token", accesToken, options)
      .cookie("refresh_token", refreshToken, options)
      .json({
        user: safeUser,
        ACCESS_TOKEN: accesToken,
        REFRESH_TOKEN: refreshToken,
        message: "Login Succesfully...!",
      });
  } catch (error) {
    res
      .status(403)
      .json({ message: error.message || "Login failed due to server error" });
  }
}

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user?.userId).select("-password");

    if (!user || user.length === 0) {
      return res.status(404).json({ message: "There are no any user" });
    }

    res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: "Failed Fetching the user" });
  }
};

async function logoutUser(req, res) {
  try {
    await User.findByIdAndUpdate(
      req.user.userId,
      { $unset: { refreshToken: 1 } },
      { new: true }
    );

    res
      .status(200)
      .clearCookie("access_token")
      .clearCookie("refresh_token")
      .json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed due to server error" });
  }
}

async function updateUser(req, res) {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({ message: "user not found" });
    }

    const { username, email, password } = req.body;

    if (username) user.username = username;
    if (email) user.email = email;
    if (password) {
      const saltRounds = 10;
      user.password = await bcrypt.hash(password, saltRounds);
    }

    await user.save();

    res
      .status(200)
      .json({ updatedUser: user, message: "user updated succesfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed updating user" + error.message });
  }
}

async function updateProfilePicture(req, res) {
  // console.log("file:", req.file);
  // console.log("user:", req.user);

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select("-password -refreshToken");

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const avatarPath = req.file?.path;

    if (!avatarPath) {
      return res.status(400).json({ message: "Avatar upload failed" });
    }

    const updatedAvatar = await uploadToCloudinary(avatarPath);

    if (!updatedAvatar) {
      return res.status(500).json({ message: "Avatar file is required" });
    }

    user.avatar = updatedAvatar.secure_url

    await user.save();

    res
      .status(201)
      .json({ updatedUser: user, message: "profile picture updated!" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to update profile picture" + error.message });
  }
}

export {
  RegisterUser,
  loginUser,
  getProfile,
  logoutUser,
  updateUser,
  updateProfilePicture,
};
