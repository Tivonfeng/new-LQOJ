#!/usr/bin/env python3
"""
GESP真题PDF下载器 - 增强版
使用浏览器自动化获取动态加载的PDF链接
需要安装: pip install selenium webdriver-manager
或者使用 Playwright: pip install playwright
"""

import os
import re
import time
import json
from urllib.parse import urljoin, urlparse
from datetime import datetime

class GESPDownloader:
    def __init__(self, output_dir="gesp_pdfs"):
        self.output_dir = output_dir
        self.base_url = "https://gesp.ccf.org.cn"
        
        # 创建输出目录
        os.makedirs(output_dir, exist_ok=True)
        
    def generate_filename(self, url, text="", prefix="GESP"):
        """生成文件名"""
        # 从URL中提取文件名
        parsed = urlparse(url)
        url_filename = os.path.basename(parsed.path)
        
        if url_filename and url_filename.lower().endswith('.pdf'):
            filename = re.sub(r'[<>:"/\\|?*]', '_', url_filename)
            return filename
        
        # 尝试从URL中提取年份和月份
        date_pattern = r'/(\d{4})(\d{2,4})/'
        match = re.search(date_pattern, url)
        if match:
            year = match.group(1)
            month = match.group(2)
            return f"{prefix}_{year}_{month}_真题.pdf"
        
        # 如果URL没有文件名，使用文本生成
        if text:
            year_match = re.search(r'(\d{4})', text)
            month_match = re.search(r'(\d+)月', text)
            
            if year_match and month_match:
                year = year_match.group(1)
                month = month_match.group(1).zfill(2)
                return f"{prefix}_{year}_{month}_真题.pdf"
        
        # 默认文件名
        timestamp = int(time.time())
        return f"{prefix}_pdf_{timestamp}.pdf"
    
    def download_file(self, url, filepath, headers=None):
        """下载文件"""
        if os.path.exists(filepath):
            print(f"文件已存在，跳过: {os.path.basename(filepath)}")
            return True
        
        try:
            import requests
            if headers is None:
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/pdf,*/*',
                    'Referer': 'https://gesp.ccf.org.cn/',
                }
            
            print(f"下载中: {os.path.basename(filepath)}")
            response = requests.get(url, headers=headers, timeout=60, stream=True)
            response.raise_for_status()
            
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            file_size = os.path.getsize(filepath)
            print(f"  完成: {file_size / 1024:.2f} KB")
            return True
            
        except Exception as e:
            print(f"  下载失败: {e}")
            return False
    
    def run_with_selenium(self):
        """使用Selenium获取动态页面内容"""
        try:
            from selenium import webdriver
            from selenium.webdriver.chrome.service import Service
            from selenium.webdriver.chrome.options import Options
            from selenium.webdriver.common.by import By
            from selenium.webdriver.support.ui import WebDriverWait
            from selenium.webdriver.support import expected_conditions as EC
            import webdriver_manager
            
            print("使用Selenium模式...")
            
            # 设置Chrome选项
            chrome_options = Options()
            chrome_options.add_argument('--headless')  # 无头模式
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--window-size=1920,1080')
            
            # 初始化浏览器
            driver = webdriver.Chrome(options=chrome_options)
            
            try:
                # 访问页面
                url = "https://gesp.ccf.org.cn/101/1010/index.html"
                print(f"访问页面: {url}")
                driver.get(url)
                
                # 等待页面加载
                time.sleep(5)
                
                # 滚动页面以加载所有内容
                for i in range(3):
                    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                    time.sleep(2)
                
                # 获取页面源代码
                page_source = driver.page_source
                
                # 查找所有链接
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(page_source, 'html.parser')
                
                pdf_links = []
                
                # 查找所有PDF链接
                for link in soup.find_all('a', href=True):
                    href = link.get('href', '')
                    text = link.get_text(strip=True)
                    
                    if '.pdf' in href.lower() or 'pdf' in href.lower():
                        full_url = urljoin(url, href)
                        if full_url not in [p['url'] for p in pdf_links]:
                            pdf_links.append({
                                'url': full_url,
                                'text': text,
                                'filename': self.generate_filename(full_url, text)
                            })
                
                # 查找JavaScript中的PDF链接
                for script in soup.find_all('script'):
                    if script.string:
                        pdf_pattern = r'["\']([^"\']*\.pdf[^"\']*)["\']'
                        for match in re.findall(pdf_pattern, script.string):
                            if match not in [p['url'] for p in pdf_links]:
                                full_url = urljoin(url, match)
                                pdf_links.append({
                                    'url': full_url,
                                    'text': 'Script PDF',
                                    'filename': self.generate_filename(full_url)
                                })
                
                print(f"找到 {len(pdf_links)} 个PDF链接")
                
                # 下载PDF
                downloaded = 0
                for i, pdf_info in enumerate(pdf_links, 1):
                    print(f"\n[{i}/{len(pdf_links)}]")
                    filepath = os.path.join(self.output_dir, pdf_info['filename'])
                    if self.download_file(pdf_info['url'], filepath):
                        downloaded += 1
                    time.sleep(1)
                
                return downloaded
                
            finally:
                driver.quit()
                
        except ImportError:
            print("Selenium未安装，请运行: pip install selenium webdriver-manager")
            return 0
    
    def run_with_playwright(self):
        """使用Playwright获取动态页面内容"""
        try:
            from playwright.sync_api import sync_playwright
            
            print("使用Playwright模式...")
            
            with sync_playwright() as p:
                # 启动浏览器
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(
                    viewport={'width': 1920, 'height': 1080},
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                )
                page = context.new_page()
                
                try:
                    # 访问页面
                    url = "https://gesp.ccf.org.cn/101/1010/index.html"
                    print(f"访问页面: {url}")
                    page.goto(url)
                    
                    # 等待页面加载
                    page.wait_for_load_state('networkidle')
                    time.sleep(3)
                    
                    # 滚动页面以加载所有内容
                    for i in range(3):
                        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                        time.sleep(2)
                    
                    # 获取页面源代码
                    page_source = page.content()
                    
                    # 查找所有链接
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(page_source, 'html.parser')
                    
                    pdf_links = []
                    
                    # 查找所有PDF链接
                    for link in soup.find_all('a', href=True):
                        href = link.get('href', '')
                        text = link.get_text(strip=True)
                        
                        if '.pdf' in href.lower() or 'pdf' in href.lower():
                            full_url = urljoin(url, href)
                            if full_url not in [p['url'] for p in pdf_links]:
                                pdf_links.append({
                                    'url': full_url,
                                    'text': text,
                                    'filename': self.generate_filename(full_url, text)
                                })
                    
                    # 查找JavaScript中的PDF链接
                    for script in soup.find_all('script'):
                        if script.string:
                            pdf_pattern = r'["\']([^"\']*\.pdf[^"\']*)["\']'
                            for match in re.findall(pdf_pattern, script.string):
                                if match not in [p['url'] for p in pdf_links]:
                                    full_url = urljoin(url, match)
                                    pdf_links.append({
                                        'url': full_url,
                                        'text': 'Script PDF',
                                        'filename': self.generate_filename(full_url)
                                    })
                    
                    print(f"找到 {len(pdf_links)} 个PDF链接")
                    
                    # 下载PDF
                    downloaded = 0
                    for i, pdf_info in enumerate(pdf_links, 1):
                        print(f"\n[{i}/{len(pdf_links)}]")
                        filepath = os.path.join(self.output_dir, pdf_info['filename'])
                        if self.download_file(pdf_info['url'], filepath):
                            downloaded += 1
                        time.sleep(1)
                    
                    return downloaded
                    
                finally:
                    browser.close()
                    
        except ImportError:
            print("Playwright未安装，请运行: pip install playwright")
            print("然后初始化: playwright install chromium")
            return 0
    
    def run_simple(self):
        """简单模式 - 直接分析页面结构"""
        import requests
        from bs4 import BeautifulSoup
        
        print("使用简单模式...")
        print("注意: 页面可能使用JavaScript动态加载，简单模式可能无法获取所有PDF链接")
        
        url = "https://gesp.ccf.org.cn/101/1010/index.html"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        }
        
        print(f"获取页面: {url}")
        response = requests.get(url, headers=headers, timeout=30)
        response.encoding = 'utf-8'
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        pdf_links = []
        
        # 查找所有PDF链接
        for link in soup.find_all('a', href=True):
            href = link.get('href', '')
            text = link.get_text(strip=True)
            
            if '.pdf' in href.lower():
                full_url = urljoin(url, href)
                if full_url not in [p['url'] for p in pdf_links]:
                    pdf_links.append({
                        'url': full_url,
                        'text': text,
                        'filename': self.generate_filename(full_url, text)
                    })
        
        # 查找JavaScript中的PDF链接
        for script in soup.find_all('script'):
            if script.string:
                pdf_pattern = r'["\']([^"\']*\.pdf[^"\']*)["\']'
                for match in re.findall(pdf_pattern, script.string):
                    if match not in [p['url'] for p in pdf_links]:
                        full_url = urljoin(url, match)
                        pdf_links.append({
                            'url': full_url,
                            'text': 'Script PDF',
                            'filename': self.generate_filename(full_url)
                        })
        
        print(f"找到 {len(pdf_links)} 个PDF链接")
        
        if pdf_links:
            print("\n发现的PDF链接:")
            for i, pdf in enumerate(pdf_links, 1):
                print(f"{i}. {pdf['filename']}")
                print(f"   URL: {pdf['url']}")
        
        # 下载PDF
        downloaded = 0
        for i, pdf_info in enumerate(pdf_links, 1):
            print(f"\n[{i}/{len(pdf_links)}]")
            filepath = os.path.join(self.output_dir, pdf_info['filename'])
            if self.download_file(pdf_info['url'], filepath, headers):
                downloaded += 1
            time.sleep(1)
        
        return downloaded
    
    def run(self):
        """主运行函数"""
        print("=" * 60)
        print("GESP真题PDF下载器")
        print("=" * 60)
        print(f"输出目录: {os.path.abspath(self.output_dir)}")
        print()
        
        # 尝试使用Playwright（推荐）
        downloaded = self.run_with_playwright()
        
        if downloaded == 0:
            # 如果Playwright失败，尝试Selenium
            downloaded = self.run_with_selenium()
        
        if downloaded == 0:
            # 如果都失败，使用简单模式
            downloaded = self.run_simple()
        
        print("\n" + "=" * 60)
        print(f"下载完成！成功下载 {downloaded} 个文件")
        print(f"文件保存在: {os.path.abspath(self.output_dir)}")
        print("=" * 60)

def main():
    downloader = GESPDownloader(output_dir="gesp_pdfs")
    downloader.run()

if __name__ == "__main__":
    main()
