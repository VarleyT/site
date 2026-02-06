const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// 定义 GitHub 图标的 SVG 路径，方便复用
const GITHUB_SVG_PATH = "M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.17.01-.61.01-.95 0-2.72-.92-3.3-.92-3.3-.42-1.08-1.09-1.37-1.09-1.37-.89-.6.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.08.38-1.98 1.03-2.63-.1-.25-.45-1.24.1-2.63 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.39.2 2.38.1 2.63.65.65 1.03 1.55 1.03 2.63 0 3.82-2.33 4.66-4.56 4.91.36.31.68.92.68 1.85 0 1.34-.01 2.42-.01 2.75 0 .21.15.46.55.38A8.013 8.013 0 0 1 16 8c0-4.42-3.58-8-8-8z";

async function fetchTrending() {
    try {
        // 使用 axios 获取 GitHub Trending 页面 HTML
        const { data } = await axios.get('https://github.com/trending', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        // 使用 cheerio 解析 HTML
        const $ = cheerio.load(data);
        const repos = [];

        // 遍历每个项目卡片
        $('article.Box-row').each((i, el) => {
            const titleTag = $(el).find('h2.h3 a');
            // 获取标题并去除多余空格
            const title = titleTag.text().trim().replace(/\s+/g, '');
            // 拼接完整的 GitHub 链接
            const link = 'https://github.com' + titleTag.attr('href');
            //获取描述，如果没有则提供默认值
            const desc = $(el).find('p.my-1').text().trim() || 'No description provided.';
            // 获取编程语言
            const lang = $(el).find('[itemprop="programmingLanguage"]').text().trim() || 'Any';
            // 获取今日 Star 数
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

    // 生成卡片 HTML
    const cards = repos.map(repo => `
        <div class="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
            <div>
                <div class="flex justify-between items-start mb-3">
                    <span class="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">${repo.lang}</span>
                    <span class="text-xs text-amber-500 font-medium flex items-center">
                        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.481-.724-1.06-1.207-2.03zM12.12 15.12a3 3 0 10-4.24-4.24 3 3 0 004.24 4.24z" clip-rule="evenodd"></path></svg>
                        ${repo.starsToday}
                    </span>
                </div>
                <a href="${repo.link}" target="_blank" class="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors block">
                    ${repo.title}
                </a>
                <p class="text-slate-500 text-sm mt-3 line-clamp-3 leading-relaxed">
                    ${repo.desc}
                </p>
            </div>

            <div class="mt-6 pt-4 border-t border-slate-50 flex justify-end">
                <a href="${repo.link}" target="_blank" class="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
                    <svg class="w-4 h-4 mr-1.5" viewBox="0 0 16 16" fill="currentColor">
                        <path fill-rule="evenodd" d="${GITHUB_SVG_PATH}"></path>
                    </svg>
                    查看项目
                    <span class="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                </a>
            </div>
        </div>
    `).join('');

    // 生成完整 HTML 页面
    const html = `
    <!DOCTYPE html>
    <html lang="zh">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Github Trending Daily</title>
        <link rel="icon" href="https://github.githubassets.com/favicons/favicon.svg" type="image/svg+xml">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; }
        </style>
    </head>
    <body class="bg-[#F6F8FA] text-slate-900"> <div class="max-w-6xl mx-auto px-4 sm:px-6 py-16">
            <header class="mb-16 text-center">
                <div class="flex justify-center items-center mb-4">
                    <svg height="48" width="48" viewBox="0 0 16 16" version="1.1" class="mr-4 text-slate-800 fill-current">
                        <path fill-rule="evenodd" d="${GITHUB_SVG_PATH}"></path>
                    </svg>
                    <h1 class="text-4xl sm:text-5xl font-extrabold text-slate-800 tracking-tight">
                        Github Trending
                    </h1>
                </div>
                <p class="text-slate-500 font-medium text-lg">每日自动更新的热门开源项目预览</p>
                <div class="inline-flex items-center mt-6 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-500 font-mono shadow-sm">
                    <span class="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    Update: ${now}
                </div>
            </header>

            <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                ${cards}
            </div>

            <footer class="mt-20 text-center text-slate-400 text-sm flex justify-center items-center">
                <svg class="w-4 h-4 mr-2 opacity-50" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="${GITHUB_SVG_PATH}"></path></svg>
                Powered by Node.js & GitHub Actions
            </footer>
        </div>
    </body>
    </html>`;

    // 确保输出目录存在并写入文件
    const distDir = path.join(__dirname, 'public');
    if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);
    fs.writeFileSync(path.join(distDir, 'index.html'), html);
}

// 主执行函数
async function run() {
    console.log('正在获取 GitHub Trending 数据...');
    const repos = await fetchTrending();

    if (repos.length > 0) {
        console.log(`成功获取 ${repos.length} 个项目，正在生成页面...`);
        generateHTML(repos);
        console.log('index.html 生成完成！');
    } else {
        console.error('未获取到数据，跳过页面生成。');
        process.exit(1); // 抓取失败时让 Action 报错
    }
}

run();