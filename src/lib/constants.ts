import { TaskType, Priority, EnergyLevel } from '@/types';

export type PresetAction = {
  name: string;
  type: TaskType;
  priority: Priority;
  energyLevel: EnergyLevel;
  duration: number;
};

export type PresetPlatform = {
  id: string;
  icon: string;
  name: string;
  color: string;
  actions: PresetAction[];
};

export const PRESET_PLATFORMS: PresetPlatform[] = [
  {
    id: 'linkedin', icon: '💼', name: 'LinkedIn', color: '#0A66C2',
    actions: [
      { name: 'Network Outreach', type: 'Administrative', priority: 'High', energyLevel: 'Medium', duration: 1 },
      { name: 'Profile Optimization', type: 'Administrative', priority: 'Low', energyLevel: 'Low', duration: 1 },
      { name: 'Content Posting', type: 'Creative', priority: 'Medium', energyLevel: 'Medium', duration: 0.5 },
      { name: 'Lead Generation', type: 'Operative', priority: 'High', energyLevel: 'Medium', duration: 1.5 },
    ]
  },
  {
    id: 'instagram', icon: '📸', name: 'Instagram', color: '#E4405F',
    actions: [
      { name: 'Content Creation', type: 'Creative', priority: 'High', energyLevel: 'High', duration: 2 },
      { name: 'Story Updates', type: 'Creative', priority: 'Medium', energyLevel: 'Medium', duration: 0.5 },
      { name: 'Community Engagement', type: 'Operative', priority: 'Medium', energyLevel: 'Low', duration: 1 },
      { name: 'Reply to DMs', type: 'Administrative', priority: 'Medium', energyLevel: 'Low', duration: 0.5 },
    ]
  },
  {
    id: 'tiktok', icon: '🎵', name: 'TikTok', color: '#69C9D0',
    actions: [
      { name: 'Video Editing', type: 'Creative', priority: 'High', energyLevel: 'High', duration: 3 },
      { name: 'Trend Research', type: 'Research', priority: 'Medium', energyLevel: 'Medium', duration: 1 },
      { name: 'Content Filming', type: 'Creative', priority: 'High', energyLevel: 'High', duration: 2 },
      { name: 'Community Engagement', type: 'Operative', priority: 'Medium', energyLevel: 'Low', duration: 1 },
    ]
  },
  {
    id: 'facebook', icon: '📘', name: 'Facebook', color: '#1877F2',
    actions: [
      { name: 'Group Engagement', type: 'Operative', priority: 'Medium', energyLevel: 'Medium', duration: 1 },
      { name: 'Ad Campaign Management', type: 'Deep Work', priority: 'High', energyLevel: 'High', duration: 2 },
      { name: 'Page Updates', type: 'Administrative', priority: 'Low', energyLevel: 'Low', duration: 0.5 },
      { name: 'Respond to Comments', type: 'Administrative', priority: 'Medium', energyLevel: 'Low', duration: 0.5 },
    ]
  },
  {
    id: 'reddit', icon: '🤖', name: 'Reddit', color: '#FF4500',
    actions: [
      { name: 'Subreddit Research', type: 'Research', priority: 'Medium', energyLevel: 'Medium', duration: 1 },
      { name: 'Community Engagement', type: 'Operative', priority: 'Medium', energyLevel: 'Medium', duration: 1 },
      { name: 'Value Post Creation', type: 'Creative', priority: 'High', energyLevel: 'High', duration: 2 },
      { name: 'Monitor Brand Mentions', type: 'Administrative', priority: 'Low', energyLevel: 'Low', duration: 0.5 },
    ]
  },
  {
    id: 'whatsapp', icon: '💬', name: 'WhatsApp', color: '#25D366',
    actions: [
      { name: 'Review New Messages', type: 'Administrative', priority: 'Medium', energyLevel: 'Low', duration: 0.5 },
      { name: 'Client Follow-up', type: 'Administrative', priority: 'High', energyLevel: 'Medium', duration: 1 },
      { name: 'Send Quotes/Proposals', type: 'Operative', priority: 'High', energyLevel: 'Medium', duration: 1 },
      { name: 'Support Replies', type: 'Administrative', priority: 'Medium', energyLevel: 'Low', duration: 0.5 },
      { name: 'Team Sync Discussion', type: 'Meetings', priority: 'Medium', energyLevel: 'Medium', duration: 0.5 },
    ]
  },
  {
    id: 'email', icon: '📧', name: 'Email', color: '#EA4335',
    actions: [
      { name: 'Inbox Zero (Triage)', type: 'Administrative', priority: 'Medium', energyLevel: 'Low', duration: 0.5 },
      { name: 'Reply to Urgent Emails', type: 'Administrative', priority: 'High', energyLevel: 'Medium', duration: 1 },
      { name: 'Draft Campaign/Newsletter', type: 'Creative', priority: 'Medium', energyLevel: 'High', duration: 2 },
      { name: 'Cold Outreach', type: 'Administrative', priority: 'Medium', energyLevel: 'Medium', duration: 1 },
    ]
  },
  {
    id: 'figma', icon: '🎨', name: 'Figma', color: '#F24E1E',
    actions: [
      { name: 'UI Design', type: 'Creative', priority: 'High', energyLevel: 'High', duration: 3 },
      { name: 'Create Wireframes', type: 'Deep Work', priority: 'Medium', energyLevel: 'High', duration: 2 },
      { name: 'Design Review', type: 'QA/Testing', priority: 'Medium', energyLevel: 'Medium', duration: 1 },
      { name: 'Export Assets', type: 'Operative', priority: 'Low', energyLevel: 'Low', duration: 0.5 },
      { name: 'Prototyping', type: 'Creative', priority: 'High', energyLevel: 'High', duration: 2 },
      { name: 'Design System Update', type: 'Deep Work', priority: 'Medium', energyLevel: 'Medium', duration: 2 },
    ]
  },
  {
    id: 'vscode', icon: '💻', name: 'VS Code', color: '#007ACC',
    actions: [
      { name: 'Feature Development', type: 'Deep Work', priority: 'High', energyLevel: 'High', duration: 4 },
      { name: 'Fix Critical Bugs', type: 'Deep Work', priority: 'High', energyLevel: 'High', duration: 2 },
      { name: 'Code Review (PRs)', type: 'QA/Testing', priority: 'Medium', energyLevel: 'Medium', duration: 1 },
      { name: 'Refactoring', type: 'Deep Work', priority: 'Medium', energyLevel: 'High', duration: 2 },
      { name: 'Write Unit Tests', type: 'QA/Testing', priority: 'Medium', energyLevel: 'Medium', duration: 2 },
      { name: 'Environment Setup', type: 'Operative', priority: 'Low', energyLevel: 'Medium', duration: 1 },
    ]
  },
  {
    id: 'webflow', icon: '🌐', name: 'Webflow', color: '#4353FF',
    actions: [
      { name: 'Build Landing Page', type: 'Deep Work', priority: 'High', energyLevel: 'High', duration: 4 },
      { name: 'CMS Setup / Updates', type: 'Operative', priority: 'Medium', energyLevel: 'Medium', duration: 2 },
      { name: 'Interactions & Animations', type: 'Creative', priority: 'Medium', energyLevel: 'High', duration: 2 },
      { name: 'Responsive Fixes', type: 'QA/Testing', priority: 'High', energyLevel: 'Medium', duration: 1.5 },
      { name: 'Site Publish & SEO', type: 'Operative', priority: 'High', energyLevel: 'Medium', duration: 1 },
    ]
  },
  {
    id: 'make', icon: '⚙️', name: 'Make', color: '#9A36FA',
    actions: [
      { name: 'Build Workflow Automation', type: 'Deep Work', priority: 'High', energyLevel: 'High', duration: 3 },
      { name: 'Debug Failing Scenario', type: 'QA/Testing', priority: 'High', energyLevel: 'High', duration: 1.5 },
      { name: 'API Integration Setup', type: 'Deep Work', priority: 'High', energyLevel: 'High', duration: 2 },
      { name: 'Optimize Operations', type: 'Operative', priority: 'Medium', energyLevel: 'Medium', duration: 2 },
    ]
  },
  {
    id: 'airtable', icon: '📊', name: 'Airtable', color: '#F82B60',
    actions: [
      { name: 'Database Architecture', type: 'Deep Work', priority: 'High', energyLevel: 'High', duration: 3 },
      { name: 'Create Dashboards', type: 'Creative', priority: 'Medium', energyLevel: 'Medium', duration: 2 },
      { name: 'Automations Setup', type: 'Operative', priority: 'Medium', energyLevel: 'High', duration: 1.5 },
      { name: 'Data Cleanup', type: 'Administrative', priority: 'Low', energyLevel: 'Low', duration: 1 },
      { name: 'Form Configuration', type: 'Operative', priority: 'Medium', energyLevel: 'Low', duration: 0.5 },
    ]
  },
  {
    id: 'monday', icon: '📅', name: 'Monday.com', color: '#FF3D57',
    actions: [
      { name: 'Board Creation & Setup', type: 'Operative', priority: 'High', energyLevel: 'Medium', duration: 2 },
      { name: 'Sprint Planning', type: 'Administrative', priority: 'High', energyLevel: 'Medium', duration: 1.5 },
      { name: 'Client Dashboard Updates', type: 'Administrative', priority: 'Medium', energyLevel: 'Low', duration: 1 },
      { name: 'Task Triage', type: 'Administrative', priority: 'Medium', energyLevel: 'Low', duration: 0.5 },
    ]
  },
  {
    id: 'salesforce', icon: '☁️', name: 'Salesforce', color: '#00A1E0',
    actions: [
      { name: 'CRM Data Entry', type: 'Administrative', priority: 'Low', energyLevel: 'Low', duration: 1 },
      { name: 'Lead Pipeline Review', type: 'Operative', priority: 'High', energyLevel: 'Medium', duration: 1 },
      { name: 'Custom Reports Generation', type: 'Operative', priority: 'Medium', energyLevel: 'Medium', duration: 1.5 },
      { name: 'Account Updates', type: 'Administrative', priority: 'Low', energyLevel: 'Low', duration: 0.5 },
    ]
  },
  {
    id: 'meetings', icon: '📞', name: 'Meetings', color: '#FF9900',
    actions: [
      { name: 'Daily Standup', type: 'Meetings', priority: 'High', energyLevel: 'Medium', duration: 0.5 },
      { name: 'Discovery Client Call', type: 'Meetings', priority: 'High', energyLevel: 'High', duration: 1 },
      { name: 'Sales Pitch', type: 'Meetings', priority: 'High', energyLevel: 'High', duration: 1 },
      { name: 'Internal Brainstorming', type: 'Creative', priority: 'Medium', energyLevel: 'Medium', duration: 1.5 },
      { name: 'Design Handoff', type: 'Meetings', priority: 'Medium', energyLevel: 'Medium', duration: 1 },
    ]
  },
  {
    id: 'health', icon: '🥑', name: 'Health & Wellness', color: '#00C2A8',
    actions: [
      { name: 'Gym / Workout', type: 'Operative', priority: 'High', energyLevel: 'High', duration: 1.5 },
      { name: 'Doctor Appointment', type: 'Administrative', priority: 'High', energyLevel: 'Medium', duration: 1 },
      { name: 'Meal Prep', type: 'Operative', priority: 'Medium', energyLevel: 'Low', duration: 1 },
      { name: 'Therapy / Mental Health', type: 'Meetings', priority: 'High', energyLevel: 'Medium', duration: 1 },
    ]
  },
  {
    id: 'personal', icon: '🍿', name: 'Personal & Leisure', color: '#FFB020',
    actions: [
      { name: 'Personal Errands', type: 'Administrative', priority: 'Medium', energyLevel: 'Medium', duration: 1.5 },
      { name: 'Cinema / Movies', type: 'Creative', priority: 'Low', energyLevel: 'Low', duration: 2.5 },
      { name: 'Family & Friends Time', type: 'Meetings', priority: 'High', energyLevel: 'Medium', duration: 2 },
      { name: 'Reading / Hobby', type: 'Research', priority: 'Low', energyLevel: 'Low', duration: 1 },
    ]
  }
];
export const TASK_TYPES: TaskType[] = [
  'Deep Work',
  'Operative',
  'Administrative',
  'Meetings',
  'Creative',
  'Research',
  'QA/Testing'
];
