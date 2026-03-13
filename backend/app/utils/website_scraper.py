from urllib.parse import urlparse
import socket
import ipaddress
import requests
from bs4 import BeautifulSoup
from app.utils.scrappy_web import Scrappyweb
from scrapy.crawler import CrawlerProcess
from app.utils.static_scraper import Staticscraper
import app.utils.settings as my_settings
from scrapy.settings import Settings
import os
import threading
import json

class Webscrapper:
    def __init__(self, url):
        self.url =url
        self.static = Staticscraper(self.url)
        

    def safety_check(self):
        check = urlparse(self.url)

        if check.scheme not in ["http", "https"]:
            return False
        
        if not check.hostname:
            return False
        
        try:
            ip = socket.gethostbyname(check.hostname)
            ip_obj = ipaddress.ip_address(ip)

            if (ip_obj.is_private 
                or ip_obj.is_loopback 
                or ip_obj.is_link_local 
                or ip_obj.is_reserved
                or ip_obj.is_multicast
                or ip_obj.is_unspecified):
                return False
            return True
        except:
            return False
        finally:
            print("safty checked")

    def detect_website(self):
        if not self.safety_check():
            return None
        
        response = requests.get(
            self.url,
            timeout=10,
            allow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0"}
        )
        self.html = response.text
        self.soup = BeautifulSoup(self.html, "lxml")
        
        try:

            if response.status_code >= 400:
                return None
            content_type = response.headers.get("Content-Type", "")
            if "text/html" not in content_type:
                return None
            return response.text       
        
        except requests.exceptions.Timeout:
            return None
        
    def website_extract(self, html):
        print("choose tool")

        try:

            script_tag = self.soup.find_all("script")
            tag_count = len(script_tag)

            for script_or_style in self.soup(["script", "style", "noscript"]):
                script_or_style.decompose()

            clean_text = ' '.join(self.soup.stripped_strings)

            text_length = len(clean_text)
            html_length = len(html)

            print("Text length:", text_length)
            print("HTML length:", html_length)
            print("Script count:", tag_count)
            
            if html_length == 0:
                return "dynamic"
            if tag_count > 25:
                return "dynamic"

            if self.soup.find(id="root") or self.soup.find(id="app"):
                return "dynamic"
            
            if "__NEXT_DATA__" in html or "webpack" in html:
                return "dynamic"
            
            return "static"
        
        except:
            return "clean process function check"


    def static_scrapper(self):
        print("static called")
        return self.static.static_scrap()

    def dynamic_scrapper(self):
         print("dynamic called")

         output_file = "dynamic_output.json"
        
         if os.path.exists(output_file):
             os.remove(output_file)

         scrapy_settings = Settings()
         scrapy_settings.setmodule(my_settings)

         def run_spider():
            process = CrawlerProcess(scrapy_settings)
            process.crawl(Scrappyweb, url=self.url)
            process.start()
         thread = threading.Thread(target=run_spider)
         thread.start()
         thread.join()
        
         if os.path.exists(output_file):
            with open(output_file, "r", encoding="utf-8") as f:
                return json.load(f)

         
         return []
       

    def scrapper_choose(self, single_page=False):

        html = self.detect_website()

        if not html:
            return "website is not available"

        site_type = self.website_extract(html)

        try:
            if single_page:
                print("single page mode")

                if site_type == "static":
                    self.static.max_depth = 0
                    return self.static_scrapper()

                else:
                    data = self.dynamic_scrapper()

                    # single page
                    if isinstance(data, list):

                        for page in data:
                            if page.get("url") == self.url:
                                return [page]

                        # fallback
                        if len(data) > 0:
                            return [data[0]]

                    return data

            if site_type == "static":
                return self.static_scrapper()

            else:
                return self.dynamic_scrapper()

        except Exception as e:
            print("ERROR:", e)
            print(self.scrapper_choose)
            return "scrapper choose function check"