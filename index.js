const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const GITHUB_ICON_URL = "https://github.githubassets.com/favicons/favicon.svg";

async function fetchTrending() {
    try {
        const { data } = await axios.get('https://github.com/trending', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(data);
        const repos = [];

        $('article.Box-row').each((i, el) => {
            const titleTag = $(el).find('h2.h3 a');
            const title = titleTag.text().trim().replace(/\s+/g, '');
            const link = 'https://github.com' + titleTag.attr('href');
            const desc = $(el).find('p.my-1').text().trim() || 'No description provided.';
            const lang = $(el).find('[itemprop="programmingLanguage"]').text().trim() || 'Other';
            const starsToday = $(el).find('span.d-inline-block.float-sm-right').text().trim();

            repos.push({ title, link, desc, lang, starsToday });
        });

        return repos;
    } catch (error) {
        console.error('抓取失败:', error);
        return [];
    }
}

function generateHTML(repos) {
    const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

    // 1. 提取并排序语言
    const uniqueLangs = [...new Set(repos.map(r => r.lang))].sort((a, b) => a.localeCompare(b));
    const languages = ["ALL", ...uniqueLangs];

    // 2. 生成筛选按钮 HTML
    const filterButtons = languages.map(lang => `
        <button
            onclick="filterLang('${lang}')"
            data-nav-lang="${lang}"
            class="filter-btn px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${lang === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}"
        >
            ${lang}
        </button>
    `).join('');

    // 3. 生成项目卡片（添加 data-lang 属性）
    const cards = repos.map(repo => {
        const langKey = repo.lang.toLowerCase().replace('typescript', 'ts').replace('shell', 'bash').replace('javascript', 'js');
        const langIcon = `https://skillicons.dev/icons?i=${langKey}`;

        return `
        <div class="repo-card group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between" data-lang="${repo.lang}">
            <div>
                <div class="flex justify-between items-start mb-4">
                    <span class="inline-flex items-center text-xs font-bold px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg border border-slate-100">
                        <img src="${langIcon}" class="w-3.5 h-3.5 mr-1.5 rounded-sm" alt="${repo.lang}" onerror="this.style.display='none'">
                        ${repo.lang}
                    </span>
                    <span class="text-xs text-amber-500 font-medium flex items-center">
                        <svg class="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        ${repo.starsToday}
                    </span>
                </div>
                <a href="${repo.link}" target="_blank" class="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors flex items-center mb-3">
                    <img src="${GITHUB_ICON_URL}" class="w-5 h-5 mr-2.5 flex-shrink-0" alt="GitHub">
                    <span class="truncate">${repo.title}</span>
                </a>
                <p class="text-slate-500 text-sm line-clamp-3 leading-relaxed">
                    ${repo.desc}
                </p>
            </div>
            <div class="mt-6 pt-4 border-t border-slate-50 flex justify-end">
                <a href="${repo.link}" target="_blank" class="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors text-right">
                    查看项目 <span class="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                </a>
            </div>
        </div>
        `;
    }).join('');

    const html = `
    <!DOCTYPE html>
    <html lang="zh">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Github Trending Daily</title>
        <link rel="icon" href="${GITHUB_ICON_URL}" type="image/svg+xml">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; }
            .filter-btn.active { background-color: #1e293b; color: white; border-color: #1e293b; }
        </style>
    </head>
    <body class="bg-[#F6F8FA] text-slate-900">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-16">
            <header class="mb-8 text-center">
                <div class="flex justify-center items-center mb-6">
                    <img src="${GITHUB_ICON_URL}" class="w-12 h-12 mr-4" alt="GitHub logo">
                    <h1 class="text-4xl sm:text-5xl font-extrabold text-slate-800 tracking-tight">
                        Github Trending
                    </h1>
                </div>
                <p class="text-slate-500 font-medium text-lg">每日自动更新的热门开源项目预览</p>
                <div class="inline-flex items-center mt-6 px-4 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-slate-500 font-mono shadow-sm">
                    <span class="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    Update: ${now}
                </div>
            </header>

            <div class="flex flex-wrap justify-center gap-2 mb-12 max-w-4xl mx-auto">
                ${filterButtons}
            </div>

            <div id="repo-grid" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                ${cards}
            </div>

            <footer class="mt-20 text-center text-slate-400 text-sm flex justify-center items-center">
                <img src="${GITHUB_ICON_URL}" class="w-4 h-4 mr-2 opacity-50" alt="GitHub">
                Powered by Node.js & GitHub Actions
            </footer>
        </div>

        <script>
            function filterLang(lang) {
                const cards = document.querySelectorAll('.repo-card');
                const buttons = document.querySelectorAll('.filter-btn');

                // 更新按钮样式
                buttons.forEach(btn => {
                    if (btn.getAttribute('data-nav-lang') === lang) {
                        btn.classList.add('bg-slate-800', 'text-white', 'border-slate-800');
                        btn.classList.remove('bg-white', 'text-slate-600', 'border-slate-200');
                    } else {
                        btn.classList.remove('bg-slate-800', 'text-white', 'border-slate-800');
                        btn.classList.add('bg-white', 'text-slate-600', 'border-slate-200');
                    }
                });

                // 过滤卡片
                cards.forEach(card => {
                    if (lang === 'ALL' || card.getAttribute('data-lang') === lang) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                });
            }
        </script>
    </body>
    </html>`;

    const distDir = path.join(__dirname, 'public');
    if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);
    fs.writeFileSync(path.join(distDir, 'index.html'), html);
}

async function run() {
    console.log('正在获取数据...');
    const repos = await fetchTrending();
    if (repos.length > 0) {
        generateHTML(repos);
        console.log('页面生成完成！');
    } else {
        process.exit(1);
    }
}

run();