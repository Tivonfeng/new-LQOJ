#!/usr/bin/env python3
"""
GESP真题PDF下载器
下载 https://gesp.ccf.org.cn/101/1010/index.html 页面中的所有PDF文件
"""

import requests
from bs4 import BeautifulSoup
import re
import os
import json
from urllib.parse import urljoin, urlparse
import time

class GESPDownloader:
    def __init__(self, base_url="https://gesp.ccf.org.cn", output_dir="gesp_pdfs"):
        self.base_url = base_url
        self.output_dir = output_dir
        self.session = requests.Session()
        
        # 请求头，模拟浏览器访问
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        }
        
        # 创建输出目录
        os.makedirs(output_dir, exist_ok=True)
        
    def fetch_page(self, url):
        """获取页面内容"""
        try:
            response = self.session.get(url, headers=self.headers, timeout=30)
            response.encoding = 'utf-8'
            return response.text
        except Exception as e:
            print(f"获取页面失败 {url}: {e}")
            return None
    
    def extract_pdf_links(self, html_content, page_url):
        """从页面中提取PDF链接"""
        soup = BeautifulSoup(html_content, 'html.parser')
        pdf_links = []
        
        # 方法1: 查找所有包含.pdf的链接
        for link in soup.find_all('a', href=True):
            href = link.get('href', '')
            text = link.get_text(strip=True)
            
            # 检查是否是PDF链接
            if href.lower().endswith('.pdf') or '.pdf?' in href.lower():
                full_url = urljoin(page_url, href)
                pdf_links.append({
                    'url': full_url,
                    'text': text,
                    'filename': self.generate_filename(full_url, text)
                })
        
        # 方法2: 查找可能通过JavaScript动态加载的PDF链接
        # 查找包含"详情"或"真题"的链接
        for link in soup.find_all('a', href=True):
            href = link.get('href', '')
            text = link.get_text(strip=True)
            
            if '详情' in text or '真题' in text or 'pdf' in href.lower():
                if href not in [p['url'] for p in pdf_links]:
                    full_url = urljoin(page_url, href)
                    pdf_links.append({
                        'url': full_url,
                        'text': text,
                        'filename': self.generate_filename(full_url, text)
                    })
        
        # 方法3: 查找script标签中的PDF链接
        for script in soup.find_all('script'):
            if script.string:
                # 查找PDF链接模式
                pdf_pattern = r'["\']([^"\']*\.pdf[^"\']*)["\']'
                matches = re.findall(pdf_pattern, script.string)
                for match in matches:
                    if match not in [p['url'] for p in pdf_links]:
                        full_url = urljoin(page_url, match)
                        pdf_links.append({
                            'url': full_url,
                            'text': 'Script found PDF',
                            'filename': self.generate_filename(full_url, '')
                        })
        
        # 方法4: 从页面的XHR请求中查找（如果在页面加载时获取的数据）
        # 查找JSON数据中的PDF链接
        for script in soup.find_all('script'):
            if script.string:
                # 查找可能的JSON数据
                json_pattern = r'\[.*?\]'
                for match in re.findall(json_pattern, script.string):
                    try:
                        data = json.loads(match)
                        if isinstance(data, list):
                            for item in data:
                                if isinstance(item, dict):
                                    for key, value in item.items():
                                        if isinstance(value, str) and value.lower().endswith('.pdf'):
                                            if value not in [p['url'] for p in pdf_links]:
                                                full_url = urljoin(page_url, value)
                                                pdf_links.append({
                                                    'url': full_url,
                                                    'text': f'JSON: {key}',
                                                    'filename': self.generate_filename(full_url, key)
                                                })
                    except:
                        pass
        
        return pdf_links
    
    def generate_filename(self, url, text):
        """生成文件名"""
        # 从URL中提取文件名
        parsed = urlparse(url)
        url_filename = os.path.basename(parsed.path)
        
        if url_filename and url_filename.lower().endswith('.pdf'):
            # 清理文件名
            filename = re.sub(r'[<>:"/\\|?*]', '_', url_filename)
            return filename
        
        # 如果URL没有文件名，使用文本生成
        if text:
            # 提取年份和月份
            year_match = re.search(r'(\d{4})', text)
            month_match = re.search(r'(\d+)月', text)
            
            if year_match and month_match:
                year = year_match.group(1)
                month = month_match.group(1).zfill(2)
                return f"GESP_{year}_{month}_真题.pdf"
        
        # 默认文件名
        timestamp = int(time.time())
        return f"gesp_pdf_{timestamp}.pdf"
    
    def download_pdf(self, pdf_info):
        """下载单个PDF文件"""
        url = pdf_info['url']
        filename = pdf_info['filename']
        filepath = os.path.join(self.output_dir, filename)
        
        # 如果文件已存在，跳过
        if os.path.exists(filepath):
            print(f"文件已存在，跳过: {filename}")
            return True
        
        try:
            print(f"下载中: {filename}")
            print(f"  URL: {url}")
            
            response = self.session.get(url, headers=self.headers, timeout=60, stream=True)
            response.raise_for_status()
            
            # 检查是否是PDF文件
            content_type = response.headers.get('Content-Type', '').lower()
            if 'pdf' not in content_type and not url.lower().endswith('.pdf'):
                print(f"  警告: 响应可能不是PDF文件 (Content-Type: {content_type})")
            
            # 保存文件
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            file_size = os.path.getsize(filepath)
            print(f"  完成: {filename} ({file_size / 1024:.2f} KB)")
            
            return True
            
        except Exception as e:
            print(f"  下载失败: {e}")
            return False
    
    def find_detail_pages(self, html_content, page_url):
        """查找详情页面的链接"""
        soup = BeautifulSoup(html_content, 'html.parser')
        detail_links = []
        
        # 查找包含"详情"的链接
        for link in soup.find_all('a', href=True):
            href = link.get('href', '')
            text = link.get_text(strip=True)
            
            if '详情' in text:
                full_url = urljoin(page_url, href)
                if full_url not in detail_links:
                    detail_links.append(full_url)
                    print(f"找到详情页: {full_url}")
        
        return detail_links
    
    def run(self, url="https://gesp.ccf.org.cn/101/1010/index.html"):
        """主运行函数"""
        print(f"开始下载GESP真题PDF...")
        print(f"目标页面: {url}")
        print(f"输出目录: {self.output_dir}")
        print("=" * 60)
        
        # 获取主页面
        main_page = self.fetch_page(url)
        if not main_page:
            print("获取主页面失败！")
            return
        
        # 提取PDF链接
        print("\n正在分析页面内容...")
        pdf_links = self.extract_pdf_links(main_page, url)
        print(f"找到 {len(pdf_links)} 个PDF链接")
        
        # 下载PDF文件
        print("\n开始下载PDF文件...")
        downloaded = 0
        failed = 0
        
        for i, pdf_info in enumerate(pdf_links, 1):
            print(f"\n[{i}/{len(pdf_links)}]")
            if self.download_pdf(pdf_info):
                downloaded += 1
            else:
                failed += 1
            time.sleep(1)  # 礼貌性延迟
        
        # 打印总结
        print("\n" + "=" * 60)
        print("下载完成！")
        print(f"成功: {downloaded} 个文件")
        print(f"失败: {failed} 个文件")
        print(f"输出目录: {os.path.abspath(self.output_dir)}")

def main():
    # 创建下载器并运行
    downloader = GESPDownloader()
    downloader.run()

if __name__ == "__main__":
    main()
