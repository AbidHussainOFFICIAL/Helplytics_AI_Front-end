const { askAI } = require('../services/ai.service');
const User = require('../models/User');
const Request = require('../models/Request');

const {
  skillSuggestionPrompt,
  userInsightsPrompt,
} = require('../prompts/user.prompts');

const {
  autoCategorizePrompt,
  rewritePrompt,
  summaryPrompt,
  responseSuggestionPrompt,
  trendsPrompt,
} = require('../prompts/request.prompts');


// 🔹 USER AI

exports.getUserAI = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    const prompt = skillSuggestionPrompt(user);
    const response = await askAI(prompt);

    res.json({ success: true, data: JSON.parse(response) });
  } catch (err) {
    next(err);
  }
};

exports.getUserInsights = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    const prompt = userInsightsPrompt(user);
    const response = await askAI(prompt);

    res.json({ success: true, insights: response });
  } catch (err) {
    next(err);
  }
};


// 🔹 REQUEST AI

exports.autoCategorize = async (req, res, next) => {
  try {
    const prompt = autoCategorizePrompt(req.body);
    const response = await askAI(prompt);

    res.json({ success: true, data: JSON.parse(response) });
  } catch (err) {
    next(err);
  }
};

exports.rewriteRequest = async (req, res, next) => {
  try {
    const prompt = rewritePrompt(req.body);
    const response = await askAI(prompt);

    res.json({ success: true, rewrite: response });
  } catch (err) {
    next(err);
  }
};

exports.getSummary = async (req, res, next) => {
  try {
    const prompt = summaryPrompt(req.body);
    const response = await askAI(prompt);

    res.json({ success: true, summary: response });
  } catch (err) {
    next(err);
  }
};

exports.getResponseSuggestions = async (req, res, next) => {
  try {
    const prompt = responseSuggestionPrompt(req.body);
    const response = await askAI(prompt);

    res.json({ success: true, suggestions: response });
  } catch (err) {
    next(err);
  }
};


// 🔹 PLATFORM AI

exports.getTrends = async (req, res, next) => {
  try {
    const requests = await Request.find().limit(50);

    const prompt = trendsPrompt(requests);
    const response = await askAI(prompt);

    res.json({ success: true, trends: response });
  } catch (err) {
    next(err);
  }
};