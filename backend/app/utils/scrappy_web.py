import scrapy
from urllib.parse import urlparse

class Scrappyweb(scrapy.Spider):

    name = "crawler"

    def __init__(self, url):
        self.start_urls = [url]
        parsed = urlparse(url)
        self.allowed_domains = [parsed.hostname]
        self.visited = set()


    async def start(self):
        print("request started")
        for url in self.start_urls:
            yield scrapy.Request(
                url,
                meta={"playwright": True},
                callback=self.parse_site
            )

    def start_site(self):
        print("send request")
        for url in self.start_urls:
            yield scrapy.Request (
                url,
                meta={"playwright": True},
                callback=self.parse_site
            )

    blocked_keywords = [
    "login", "signin", "signup",
    "register", "search",
    "account", "cart", "checkout"
    ]

    async def parse_site (self, response):
        print("start parse_site")
        if response.url in self.visited:
            return
        
        self.visited.add(response.url)

        dynamic_content = {}

        dynamic_content["title"] = response.xpath("//title/text()").get()
        dynamic_content["headings"] = response.xpath("//h1/text()").getall()
        dynamic_content["sub_headings"] = response.xpath("//h2/text()").getall()
        dynamic_content["paragraphs"] = response.xpath("//p/text()").getall()
        dynamic_content["list_point"] = response.xpath("//li/text()").getall()
        
        yield dynamic_content

        for href in response.xpath("//a/@href").getall():
            url = response.urljoin(href)
            if (
                "?" in url or
                "#" in url or
                any(word in url.lower() for word in self.blocked_keywords)
            ):
                continue
            

            yield response.follow(
                href,
                meta={"playwright": True},
                callback=self.parse_site
            )

