// js/app-state.js

/**
 * Глобальное состояние приложения
 */
export const state = {
    selectedFile: null,
    CONFIG: {},
    currentUserProfile: {},
    targetUserIdFromLink: null,
    qrCodeInstance: null,
    currentViewedUserId: null,
    allFeedProfiles: [],
    skillsModalSource: 'form',
    isRegistered: false,
    currentLang: 'ru',
    ALL_COUNTRIES: [],
    flagsPreloadPromise: null,
    tomSelectInstance: null,
    selectedSkills: [],
};

/**
 * Категории навыков для модального окна
 */
export const SKILL_CATEGORIES = {
    "cat_lang": ["Python", "JavaScript", "Java", "C#", "C++", "Go", "Kotlin", "Swift", "PHP", "Ruby", "TypeScript"],
    "cat_frontend": ["HTML", "CSS", "React", "Vue", "Angular", "Svelte", "jQuery", "Bootstrap", "Tailwind"],
    "cat_backend": ["Node.js", "Django", "Flask", "Spring", "ASP.NET", "Laravel", "Ruby on Rails"],
    "cat_db": ["PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Firebase"],
    "cat_mobile": ["Android", "iOS", "React Native", "Flutter"],
    "cat_devops": ["Docker", "Kubernetes", "Git", "Jenkins", "Terraform", "AWS", "GCP", "Azure"],
    "cat_design": ["Figma", "Sketch", "Adobe XD", "Photoshop", "Illustrator"]
};