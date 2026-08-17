import scrapy
from urllib.parse import urlparse
from scrapy_playwright.page import PageMethod


def _dedupe(items):
    seen = set()
    out = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            out.append(item)
    return out


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
                meta={
                "playwright": True,
                "playwright_page_methods": [
                    PageMethod("wait_for_load_state", "networkidle"),
                ],
            },
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
        "account", "cart", "checkout",
        "disambiguation", "privacy", "terms",
        "copyright", "cookie", "action=",
        "wikipedia:", "special:", "help:",
        "talk:", "user:", "category:",
        "portal:", "template:", "file:"
    ]

    async def parse_site(self, response):
        print("start parse_site")
        if response.url in self.visited:
            return
        response.selector.remove_namespaces()

        for bad in response.xpath("//header | //footer | //nav | //aside"):
            bad.root.getparent().remove(bad.root)

        self.visited.add(response.url)

        dynamic_content = {}

        content_area = response.xpath("//main | //article | //section")
        if not content_area:
            content_area = response.xpath("//body")

        dynamic_content["url"] = response.url
        dynamic_content["title"] = response.xpath("//title/text()").get()
        dynamic_content["headings"] = [
            " ".join(h.xpath(".//text()").getall()).strip()
            for h in content_area.xpath(".//h1")
        ]
        dynamic_content["sub_headings"] = [
            " ".join(h.xpath(".//text()").getall()).strip()
            for h in content_area.xpath(".//h2")
        ]
        dynamic_content["paragraphs"] = [
            " ".join(p.xpath(".//text()").getall()).strip()
            for p in content_area.xpath(".//p")
        ]
        dynamic_content["list_point"] = [
            " ".join(li.xpath(".//text()").getall()).strip()
            for li in content_area.xpath(".//li")
        ]

        # dedupe first (removes repeated content from overlapping main/article/section selectors)
        for key in ["headings", "sub_headings", "paragraphs", "list_point"]:
            dynamic_content[key] = _dedupe(dynamic_content[key])

        # drop empty/junk after joining nested text
        for key in ["headings", "sub_headings", "paragraphs", "list_point"]:
            dynamic_content[key] = [t for t in dynamic_content[key] if t and len(t) >= 20]

        yield dynamic_content

        for href in response.xpath("//a/@href").getall():
            url = response.urljoin(href)
            parsed_scheme = urlparse(url).scheme
            if parsed_scheme not in ("http", "https"):
                continue

            if (
                "?" in url or
                "#" in url or
                any(word in url.lower() for word in self.blocked_keywords) or
                url.lower().endswith((".pdf",".jpg",".jpeg",".png",".svg",".gif",".zip"))
            ):
                continue

            yield response.follow(
                href,
                meta={
                    "playwright": True,
                    "playwright_page_methods": [
                        PageMethod("wait_for_load_state", "networkidle"),
                    ],
                },
                callback=self.parse_site
            )
