<?php
$page = isset($_GET['page']) ? $_GET['page'] : 'home';

// Handle contact form submission
$form_success = false;
$form_error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['contact_submit'])) {
    $name    = htmlspecialchars(trim($_POST['name'] ?? ''));
    $email   = htmlspecialchars(trim($_POST['email'] ?? ''));
    $phone   = htmlspecialchars(trim($_POST['phone'] ?? ''));
    $service = htmlspecialchars(trim($_POST['service'] ?? ''));
    $message = htmlspecialchars(trim($_POST['message'] ?? ''));

    if ($name && filter_var($email, FILTER_VALIDATE_EMAIL) && $message) {
        // Save to SQLite
        try {
            $db = new PDO('sqlite:auromind_contacts.db');
            $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $db->exec("CREATE TABLE IF NOT EXISTS contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT, email TEXT, phone TEXT,
                service TEXT, message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )");
            $stmt = $db->prepare("INSERT INTO contacts (name, email, phone, service, message) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$name, $email, $phone, $service, $message]);
            $form_success = true;
        } catch (Exception $e) {
            $form_error = 'Could not save message. Please try again.';
        }
    } else {
        $form_error = 'Please fill in all required fields with a valid email.';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Auromind AI — Next-Gen Tech Solutions</title>
    <link rel="icon" type="image/png" href="logo.png">
    <link rel="shortcut icon" type="image/png" href="logo.png">
    <link rel="apple-touch-icon" href="logo.png">
    <meta name="description" content="Auromind AI — WhatsApp AI SaaS, Enterprise Web Apps, Android & IoT Solutions. Transforming businesses with intelligent technology.">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        /* =============================================
           DESIGN TOKENS — Professional White + Blue
        ============================================= */
        :root {
            --primary:       #1a56db;   /* Deep trust blue */
            --primary-dark:  #1e429f;
            --primary-light: #ebf5ff;
            --accent:        #0ea5e9;   /* Sky accent */
            --green:         #10b981;
            --text-dark:     #0f172a;
            --text-mid:      #374151;
            --text-muted:    #6b7280;
            --bg:            #ffffff;
            --bg-alt:        #f0f7ff;
            --bg-deep:       #e8f1ff;
            --border:        #dbeafe;
            --shadow-sm:     0 1px 3px rgba(26,86,219,.08);
            --shadow-md:     0 4px 24px rgba(26,86,219,.12);
            --shadow-lg:     0 12px 48px rgba(26,86,219,.16);
            --radius:        12px;
        }

        html { scroll-behavior: smooth; }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Inter', sans-serif;
            background: var(--bg);
            color: var(--text-dark);
            line-height: 1.7;
            overflow-x: hidden;
        }

        h1,h2,h3,h4,h5 { font-family: 'Outfit', sans-serif; }

        img { max-width: 100%; display: block; }

        a { text-decoration: none; }

        /* =============================================
           UTILITY
        ============================================= */
        .container { max-width: 1200px; margin: 0 auto; padding: 0 5%; }
        .section    { padding: 90px 0; }
        .section-alt { background: var(--bg-alt); }

        .section-tag {
            display: inline-block;
            background: var(--primary-light);
            color: var(--primary);
            padding: 0.3rem 1rem;
            border-radius: 999px;
            font-size: 0.8rem;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            margin-bottom: 1rem;
            border: 1px solid #bfdbfe;
        }

        .section-title {
            font-size: 2.5rem;
            font-weight: 800;
            color: var(--text-dark);
            line-height: 1.15;
            margin-bottom: 1rem;
        }

        .section-subtitle {
            font-size: 1.1rem;
            color: var(--text-muted);
            max-width: 600px;
            margin-bottom: 3rem;
        }

        .text-center { text-align: center; }
        .text-center .section-subtitle { margin-left: auto; margin-right: auto; }

        .gradient-text {
            background: linear-gradient(135deg, var(--primary), var(--accent));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        /* =============================================
           BUTTONS
        ============================================= */
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 0.85rem 2rem;
            border-radius: 8px;
            font-weight: 700;
            font-size: 0.95rem;
            transition: all 0.3s ease;
            cursor: pointer;
            border: none;
            font-family: 'Outfit', sans-serif;
        }

        .btn-primary {
            background: linear-gradient(135deg, var(--primary), var(--primary-dark));
            color: #fff;
            box-shadow: 0 4px 16px rgba(26,86,219,.35);
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(26,86,219,.45);
        }

        .btn-outline {
            background: transparent;
            color: var(--primary);
            border: 2px solid var(--primary);
        }

        .btn-outline:hover {
            background: var(--primary-light);
            transform: translateY(-2px);
        }

        .btn-white {
            background: #fff;
            color: var(--primary);
            box-shadow: var(--shadow-md);
        }

        .btn-white:hover {
            box-shadow: var(--shadow-lg);
            transform: translateY(-2px);
        }

        /* =============================================
           HEADER / NAV
        ============================================= */
        #site-header {
            position: fixed;
            top: 0; left: 0; right: 0;
            z-index: 999;
            background: rgba(255,255,255,.95);
            border-bottom: 1px solid var(--border);
            backdrop-filter: blur(10px);
            transition: box-shadow 0.3s;
        }

        #site-header.scrolled { box-shadow: var(--shadow-md); }

        .nav-inner {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.9rem 5%;
            max-width: 1400px;
            margin: 0 auto;
        }

        .logo-container {
            display: flex;
            align-items: center;
            gap: 10px;
            color: var(--text-dark);
        }

        .logo-img { width: 46px; height: 46px; object-fit: contain; border-radius: 10px; display: block; }
        .logo-img-footer { width: 38px; height: 38px; object-fit: contain; border-radius: 8px; display: block; }

        .logo-text {
            font-family: 'Outfit', sans-serif;
            font-size: 1.5rem;
            font-weight: 800;
            color: #0f172a;
            background: none;
            -webkit-background-clip: unset;
            -webkit-text-fill-color: #0f172a;
            letter-spacing: -0.3px;
        }

        .nav-links {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            list-style: none;
        }

        .nav-links a {
            color: var(--text-mid);
            font-weight: 600;
            font-size: 0.9rem;
            padding: 0.5rem 0.75rem;
            border-radius: 6px;
            transition: all 0.2s;
        }

        .nav-links a:hover,
        .nav-links a.active { color: var(--primary); background: var(--primary-light); }

        /* =============================================
           HERO SECTION
        ============================================= */
        #hero {
            min-height: 100vh;
            display: flex;
            align-items: center;
            background: linear-gradient(160deg, #f0f7ff 0%, #ffffff 55%, #e8f1ff 100%);
            padding-top: 80px;
            position: relative;
            overflow: hidden;
        }

        #hero::before {
            content: '';
            position: absolute;
            top: -200px; right: -200px;
            width: 700px; height: 700px;
            background: radial-gradient(circle, rgba(14,165,233,.12), transparent 65%);
        }

        #hero::after {
            content: '';
            position: absolute;
            bottom: -150px; left: -150px;
            width: 500px; height: 500px;
            background: radial-gradient(circle, rgba(26,86,219,.08), transparent 65%);
        }

        .hero-inner {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4rem;
            align-items: center;
            padding: 0 5%;
            max-width: 1300px;
            margin: 0 auto;
            width: 100%;
            position: relative;
            z-index: 1;
        }

        .hero-text .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #fff;
            border: 1px solid #bfdbfe;
            color: var(--primary);
            padding: 0.4rem 1rem;
            border-radius: 999px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
            box-shadow: var(--shadow-sm);
        }

        .hero-text h1 {
            font-size: 3.75rem;
            font-weight: 800;
            line-height: 1.1;
            margin-bottom: 1.5rem;
            color: var(--text-dark);
        }

        .hero-text p {
            font-size: 1.15rem;
            color: var(--text-muted);
            margin-bottom: 2.5rem;
            max-width: 520px;
        }

        .hero-buttons { display: flex; gap: 1rem; flex-wrap: wrap; }

        .hero-trust {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-top: 2rem;
            font-size: 0.9rem;
            color: var(--text-muted);
        }

        .hero-trust span { display: flex; align-items: center; gap: 4px; }
        .trust-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); }

        .hero-visual {
            background: linear-gradient(135deg, var(--primary), var(--accent));
            border-radius: 24px;
            padding: 3px;
            box-shadow: var(--shadow-lg);
            animation: float 5s ease-in-out infinite;
        }

        .hero-visual-inner {
            background: #fff;
            border-radius: 22px;
            padding: 2rem;
        }

        @keyframes float {
            0%,100% { transform: translateY(0); }
            50%      { transform: translateY(-12px); }
        }

        /* Mock dashboard card */
        .mock-dash {
            background: linear-gradient(160deg, #f0f7ff, #e8f1ff);
            border-radius: 14px;
            padding: 1.5rem;
            border: 1px solid var(--border);
        }

        .mock-dash-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }

        .mock-dash-header h4 { font-size: 1rem; color: var(--text-dark); }

        .mock-pill {
            background: #d1fae5;
            color: #065f46;
            font-size: 0.75rem;
            font-weight: 700;
            padding: 0.25rem 0.75rem;
            border-radius: 999px;
        }

        .mock-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }

        .mock-stat {
            background: #fff;
            border-radius: 10px;
            padding: 1rem;
            border: 1px solid var(--border);
        }

        .mock-stat-num { font-size: 1.75rem; font-weight: 800; color: var(--primary); }
        .mock-stat-label { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }

        .mock-bar-wrap { background: #fff; border-radius: 10px; padding: 1rem; border: 1px solid var(--border); }
        .mock-bar-label { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem; }
        .mock-bar { height: 8px; border-radius: 4px; background: #e5e7eb; overflow: hidden; margin-bottom: 8px; }
        .mock-bar-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--primary), var(--accent)); }

        /* =============================================
           SECTION 2 — MARQUEE TRUSTED LOGOS
        ============================================= */
        .trust-bar {
            background: #fff;
            border-top: 1px solid var(--border);
            border-bottom: 1px solid var(--border);
            padding: 1.5rem 0;
            overflow: hidden;
        }

        .marquee-track {
            display: flex;
            animation: marquee 20s linear infinite;
            white-space: nowrap;
        }

        .marquee-item {
            display: inline-flex;
            align-items: center;
            margin: 0 3rem;
            color: #9ca3af;
            font-size: 1rem;
            font-weight: 700;
            font-family: 'Outfit', sans-serif;
            letter-spacing: 0.5px;
        }

        .marquee-icon { font-size: 1.5rem; margin-right: 8px; }

        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

        /* =============================================
           SECTION 3 — ABOUT
        ============================================= */
        .about-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5rem;
            align-items: center;
        }

        .about-image-block {
            position: relative;
        }

        .about-card {
            background: linear-gradient(135deg, var(--primary), var(--accent));
            border-radius: 20px;
            padding: 3px;
            box-shadow: var(--shadow-lg);
        }

        .about-card-inner {
            background: #fff;
            border-radius: 18px;
            padding: 3rem;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        .about-feature-row {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
        }

        .about-icon {
            width: 44px;
            height: 44px;
            min-width: 44px;
            background: var(--primary-light);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.3rem;
        }

        .about-feature-text h5 { font-size: 1rem; font-weight: 700; margin-bottom: 3px; }
        .about-feature-text p  { font-size: 0.875rem; color: var(--text-muted); }

        .checklist { list-style: none; margin-top: 1.5rem; }
        .checklist li {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 0.75rem;
            color: var(--text-mid);
            font-size: 1rem;
        }

        .check-icon { color: var(--green); font-size: 1.1rem; font-weight: 700; }

        /* =============================================
           SECTION 4 — SERVICES (4 cards)
        ============================================= */
        .services-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 2rem;
        }

        .service-card {
            background: #fff;
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 2.5rem;
            transition: all 0.4s ease;
            position: relative;
            overflow: hidden;
        }

        .service-card::after {
            content: '';
            position: absolute;
            bottom: 0; left: 0; right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--primary), var(--accent));
            transform: scaleX(0);
            transition: transform 0.4s ease;
            transform-origin: left;
        }

        .service-card:hover {
            transform: translateY(-6px);
            box-shadow: var(--shadow-lg);
            border-color: #bfdbfe;
        }

        .service-card:hover::after { transform: scaleX(1); }

        .service-icon-wrap {
            width: 64px; height: 64px;
            background: var(--primary-light);
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            margin-bottom: 1.5rem;
            border: 1px solid #bfdbfe;
        }

        .service-card h3 { font-size: 1.35rem; margin-bottom: 0.75rem; }
        .service-card p  { color: var(--text-muted); font-size: 0.975rem; line-height: 1.7; }

        .service-card ul {
            list-style: none;
            margin-top: 1rem;
        }

        .service-card ul li {
            font-size: 0.875rem;
            color: var(--text-mid);
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 4px;
        }

        /* =============================================
           SECTION 5 — HOW IT WORKS
        ============================================= */
        .steps-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 2rem;
            position: relative;
        }

        .steps-grid::before {
            content: '';
            position: absolute;
            top: 40px;
            left: 10%;
            right: 10%;
            height: 2px;
            background: linear-gradient(90deg, var(--primary), var(--accent));
            z-index: 0;
        }

        .step-card {
            text-align: center;
            position: relative;
            z-index: 1;
        }

        .step-number {
            width: 72px; height: 72px;
            background: linear-gradient(135deg, var(--primary), var(--accent));
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
            color: #fff;
            font-size: 1.5rem;
            font-weight: 800;
            font-family: 'Outfit', sans-serif;
            box-shadow: 0 4px 16px rgba(26,86,219,.35);
        }

        .step-card h3 { font-size: 1.1rem; margin-bottom: 0.5rem; }
        .step-card p  { color: var(--text-muted); font-size: 0.9rem; }

        /* =============================================
           SECTION 6 — WHY CHOOSE US
        ============================================= */
        .why-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 2rem;
        }

        .why-card {
            background: #fff;
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 2rem;
            text-align: center;
            transition: all 0.3s ease;
        }

        .why-card:hover {
            border-color: #bfdbfe;
            box-shadow: var(--shadow-md);
        }

        .why-card-icon {
            font-size: 2.5rem;
            margin-bottom: 1rem;
        }

        .why-card h3 { font-size: 1.15rem; margin-bottom: 0.5rem; }
        .why-card p  { color: var(--text-muted); font-size: 0.9rem; }

        /* =============================================
           SECTION 7 — STATS / NUMBERS
        ============================================= */
        .stats-section {
            background: linear-gradient(135deg, var(--primary), var(--primary-dark));
            color: #fff;
            padding: 80px 0;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 2rem;
            text-align: center;
        }

        .stat-item h3 {
            font-size: 3.5rem;
            font-weight: 800;
            color: #fff;
            margin-bottom: 0.5rem;
        }

        .stat-item p { color: rgba(255,255,255,.75); font-size: 1rem; }

        /* =============================================
           SECTION 8 — PRODUCTS / UPCOMING
        ============================================= */
        .products-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 2rem;
        }

        .product-card {
            background: #fff;
            border-radius: var(--radius);
            border: 1px solid var(--border);
            overflow: hidden;
            transition: all 0.3s ease;
        }

        .product-card:hover {
            transform: translateY(-5px);
            box-shadow: var(--shadow-lg);
        }

        .product-card-header {
            background: linear-gradient(135deg, var(--primary), var(--accent));
            padding: 2rem;
            text-align: center;
            color: #fff;
        }

        .product-card-header .icon { font-size: 3rem; }
        .product-card-header h3 { font-size: 1.35rem; font-weight: 700; margin-top: 0.75rem; }

        .product-card-body { padding: 1.75rem; }
        .product-card-body p { color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1rem; }

        .product-tag {
            display: inline-block;
            background: var(--primary-light);
            color: var(--primary);
            font-size: 0.75rem;
            font-weight: 700;
            padding: 0.2rem 0.75rem;
            border-radius: 999px;
        }

        /* =============================================
           SECTION 9 — TESTIMONIALS
        ============================================= */
        .testimonials-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 2rem;
        }

        .testimonial-card {
            background: #fff;
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 2rem;
            transition: box-shadow 0.3s ease;
        }

        .testimonial-card:hover { box-shadow: var(--shadow-md); }

        .stars { color: #f59e0b; font-size: 1.1rem; margin-bottom: 1rem; }

        .testimonial-text {
            font-style: italic;
            color: var(--text-mid);
            line-height: 1.8;
            margin-bottom: 1.5rem;
        }

        .testimonial-author {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .author-avatar {
            width: 44px; height: 44px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--primary), var(--accent));
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-weight: 800;
            font-size: 1.1rem;
        }

        .author-name { font-weight: 700; font-size: 0.95rem; }
        .author-role { color: var(--text-muted); font-size: 0.8rem; }

        /* =============================================
           SECTION 10 — FAQ
        ============================================= */
        .faq-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5rem;
        }

        .faq-item {
            background: #fff;
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 1.75rem;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .faq-item:hover {
            border-color: #bfdbfe;
            box-shadow: var(--shadow-sm);
        }

        .faq-item h4 {
            font-size: 1rem;
            font-weight: 700;
            color: var(--text-dark);
            margin-bottom: 0.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .faq-item p { color: var(--text-muted); font-size: 0.9rem; }

        /* =============================================
           SECTION 11 — CONTACT FORM
        ============================================= */
        .contact-section {
            background: var(--bg-alt);
        }

        .contact-grid {
            display: grid;
            grid-template-columns: 1fr 1.6fr;
            gap: 4rem;
            align-items: start;
        }

        .contact-info h2 {
            font-size: 2.25rem;
            margin-bottom: 1rem;
        }

        .contact-info p {
            color: var(--text-muted);
            margin-bottom: 2.5rem;
        }

        .contact-detail {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            margin-bottom: 1.75rem;
        }

        .contact-detail-icon {
            width: 48px; height: 48px;
            min-width: 48px;
            background: linear-gradient(135deg, var(--primary), var(--accent));
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 1.4rem;
        }

        .contact-detail-text h5 { font-weight: 700; margin-bottom: 3px; }
        .contact-detail-text p  { color: var(--text-muted); font-size: 0.9rem; }

        .form-card {
            background: #fff;
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 3rem;
            box-shadow: var(--shadow-md);
        }

        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }

        .form-group { margin-bottom: 1.25rem; }

        .form-group label {
            display: block;
            font-weight: 600;
            font-size: 0.9rem;
            color: var(--text-dark);
            margin-bottom: 0.5rem;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 0.875rem 1rem;
            border: 1.5px solid var(--border);
            border-radius: 8px;
            font-size: 0.95rem;
            color: var(--text-dark);
            font-family: 'Inter', sans-serif;
            background: #fff;
            transition: border-color 0.3s, box-shadow 0.3s;
            outline: none;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 4px rgba(26,86,219,.1);
        }

        .form-group textarea { min-height: 140px; resize: vertical; }

        .alert {
            padding: 1rem 1.25rem;
            border-radius: 8px;
            margin-bottom: 1.25rem;
            font-size: 0.9rem;
            font-weight: 600;
        }

        .alert-success { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
        .alert-error   { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

        /* =============================================
           SECTION 12 — CTA BANNER
        ============================================= */
        .cta-banner {
            background: linear-gradient(135deg, var(--primary), var(--accent));
            padding: 80px 5%;
            text-align: center;
            position: relative;
            overflow: hidden;
        }

        .cta-banner::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -10%;
            width: 400px;
            height: 400px;
            background: rgba(255,255,255,.06);
            border-radius: 50%;
        }

        .cta-banner::after {
            content: '';
            position: absolute;
            bottom: -50%;
            right: -10%;
            width: 500px;
            height: 500px;
            background: rgba(255,255,255,.06);
            border-radius: 50%;
        }

        .cta-banner h2 { font-size: 2.75rem; color: #fff; margin-bottom: 1rem; position: relative; z-index: 1; }
        .cta-banner p  { color: rgba(255,255,255,.85); font-size: 1.15rem; margin-bottom: 2.5rem; position: relative; z-index: 1; }
        .cta-banner-btns { display: flex; gap: 1rem; justify-content: center; position: relative; z-index: 1; }

        /* =============================================
           FOOTER
        ============================================= */
        footer {
            background: #0f172a;
            color: #e2e8f0;
            padding: 5rem 5% 2rem;
        }

        .footer-grid {
            display: grid;
            grid-template-columns: 2.5fr 1fr 1fr 1fr;
            gap: 3rem;
            margin-bottom: 4rem;
        }

        .footer-brand p {
            color: #94a3b8;
            font-size: 0.95rem;
            margin-top: 1rem;
            max-width: 300px;
        }

        .footer-col h4 {
            color: #fff;
            font-size: 1rem;
            font-weight: 700;
            margin-bottom: 1.5rem;
        }

        .footer-col ul { list-style: none; }

        .footer-col ul li { margin-bottom: 0.75rem; }

        .footer-col ul a {
            color: #94a3b8;
            font-size: 0.9rem;
            transition: color 0.2s;
        }

        .footer-col ul a:hover { color: var(--accent); }

        .footer-bottom {
            border-top: 1px solid #1e293b;
            padding-top: 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.875rem;
            color: #64748b;
        }

        .footer-bottom-links { display: flex; gap: 1.5rem; }
        .footer-bottom-links a { color: #64748b; font-size: 0.875rem; transition: color 0.2s; }
        .footer-bottom-links a:hover { color: var(--accent); }

        /* =============================================
           CONTENT PAGES (Privacy / Terms)
        ============================================= */
        .content-page-wrap {
            padding: 100px 5% 60px;
            max-width: 960px;
            margin: 0 auto;
        }

        .content-box {
            background: #fff;
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 4rem;
            box-shadow: var(--shadow-sm);
        }

        .content-box h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }

        .content-date {
            color: var(--text-muted);
            font-size: 0.9rem;
            border-bottom: 1px solid var(--border);
            padding-bottom: 1.5rem;
            margin-bottom: 2rem;
        }

        .content-box h2 {
            font-size: 1.35rem;
            color: var(--primary);
            margin: 2.5rem 0 1rem;
        }

        .content-box p { color: var(--text-mid); margin-bottom: 1rem; }

        .content-box ul {
            margin: 1rem 0 1rem 1.5rem;
            color: var(--text-mid);
        }

        .content-box ul li { margin-bottom: 0.5rem; }

        /* =============================================
           RESPONSIVE
        ============================================= */
        @media (max-width: 1024px) {
            .hero-inner        { grid-template-columns: 1fr; text-align: center; }
            .hero-text p       { max-width: 100%; }
            .hero-buttons      { justify-content: center; }
            .hero-trust        { justify-content: center; }
            .hero-visual       { max-width: 500px; margin: 0 auto; }
            .about-grid        { grid-template-columns: 1fr; }
            .services-grid     { grid-template-columns: 1fr; }
            .steps-grid        { grid-template-columns: repeat(2, 1fr); }
            .steps-grid::before { display: none; }
            .why-grid          { grid-template-columns: repeat(2, 1fr); }
            .stats-grid        { grid-template-columns: repeat(2, 1fr); }
            .products-grid     { grid-template-columns: 1fr 1fr; }
            .testimonials-grid { grid-template-columns: 1fr; }
            .faq-grid          { grid-template-columns: 1fr; }
            .contact-grid      { grid-template-columns: 1fr; }
            .footer-grid       { grid-template-columns: 1fr 1fr; }
        }

        .menu-toggle {
            display: none;
            background: none;
            border: none;
            font-size: 1.8rem;
            color: var(--text-dark);
            cursor: pointer;
            padding: 0.2rem 0.5rem;
            border-radius: 6px;
        }

        .menu-toggle:hover { background: var(--bg-alt); }

        @media (max-width: 768px) {
            .nav-inner { flex-wrap: wrap; justify-content: space-between; }
            .menu-toggle { display: block; }
            .nav-links {
                display: none;
                flex-direction: column;
                width: 100%;
                gap: 0.5rem;
                padding-top: 1rem;
                border-top: 1px solid var(--border);
                margin-top: 1rem;
            }
            .nav-links.active { display: flex; }
            .nav-links a { display: block; width: 100%; text-align: center; padding: 0.75rem; }
            
            .hero-text h1           { font-size: 2.5rem; }
            .section-title          { font-size: 2rem; }
            .form-row               { grid-template-columns: 1fr; }
            .services-grid          { grid-template-columns: 1fr; }
            .products-grid          { grid-template-columns: 1fr; }
            .why-grid               { grid-template-columns: 1fr; }
            .stats-grid             { grid-template-columns: 1fr 1fr; }
            .cta-banner h2          { font-size: 2rem; }
            .cta-banner-btns        { flex-direction: column; align-items: center; }
            .footer-grid            { grid-template-columns: 1fr; }
            .footer-bottom          { flex-direction: column; gap: 1rem; text-align: center; }
            .content-box            { padding: 2rem; }
        }

        @media (max-width: 480px) {
            .hero-text h1           { font-size: 2.1rem; }
            .section-title          { font-size: 1.75rem; }
            .hero-buttons           { flex-direction: column; width: 100%; }
            .hero-buttons .btn      { width: 100%; justify-content: center; }
            .stats-grid             { grid-template-columns: 1fr; gap: 1.5rem; }
            .section                { padding: 60px 0; }
            .cta-banner             { padding: 60px 5%; }
            .footer-col             { text-align: center; }
        }
    </style>
</head>
<body>

<!-- ===================== HEADER ===================== -->
<header id="site-header">
    <div class="nav-inner">
        <a href="?page=home" class="logo-container">
            <img src="logo.png" alt="Auromind AI Logo" class="logo-img">
            <span class="logo-text">Auromind AI</span>
        </a>
        <button class="menu-toggle" aria-label="Toggle navigation" id="mobile-menu-btn">☰</button>
        <ul class="nav-links" id="nav-menu">
            <?php if ($page === 'home'): ?>
                <li><a href="#about">About</a></li>
                <li><a href="#services">Services</a></li>
                <li><a href="#products">Products</a></li>
                <li><a href="#contact">Contact</a></li>
            <?php else: ?>
                <li><a href="?page=home">Home</a></li>
            <?php endif; ?>
            <li><a href="?page=privacy" class="<?= $page == 'privacy' ? 'active' : '' ?>">Privacy</a></li>
            <li><a href="?page=terms"   class="<?= $page == 'terms'   ? 'active' : '' ?>">Terms</a></li>
            <li><a href="?page=home#contact" class="btn btn-primary" style="color:#fff; justify-content:center;">Get in Touch</a></li>
        </ul>
    </div>
</header>

<!-- ===================== MAIN ===================== -->
<main>
<?php if ($page === 'privacy'): ?>
<!-- =================== PRIVACY POLICY =================== -->
<div class="content-page-wrap">
    <div class="content-box">
        <h1>Privacy Policy</h1>
        <div class="content-date">Last updated: <?php echo date('F d, Y'); ?></div>
        <p>At <strong>Auromind AI</strong>, accessible from our services, one of our main priorities is the privacy of our visitors and users. This Privacy Policy document contains types of information that is collected and recorded by Auromind AI and how we use it.</p>
        <p>If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact us through our website.</p>

        <h2>1. Information We Collect</h2>
        <p>We collect information to provide better services to all our users. The personal information that you are asked to provide, and the reasons why, will be made clear to you at the point we ask you to provide it. This includes:</p>
        <ul>
            <li>Name, email address, and contact details when you use our contact form.</li>
            <li>Usage data and logs when you interact with our web applications.</li>
            <li>Device and browser information for analytics and security purposes.</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <ul>
            <li>Provide, operate, and maintain our services</li>
            <li>Improve, personalize, and expand our services</li>
            <li>Understand and analyze how you use our services</li>
            <li>Develop new products, services, features, and functionality</li>
            <li>Communicate with you for customer service, updates, and marketing</li>
        </ul>

        <h2>3. Log Files</h2>
        <p>Auromind AI follows a standard procedure of using log files. These files log visitors when they visit our website. The information collected by log files includes internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and number of clicks. These are not linked to personally identifiable information.</p>

        <h2>4. Cookies</h2>
        <p>Like most websites, Auromind AI uses cookies to improve the user experience. Cookies help us understand your preferences, improve our services, and deliver more personalized features. You may choose to disable cookies through your browser settings, although this may affect some functionality of the website.</p>

        <h2>5. Meta / WhatsApp Business API Data</h2>
        <p>When using our upcoming WhatsApp AI SaaS product, data processing will be strictly governed by our terms with Meta and WhatsApp Business APIs. Conversational data is processed solely for delivering the requested AI service. We do not sell your conversational data to third parties.</p>

        <h2>6. Third Party Privacy Policies</h2>
        <p>Auromind AI's Privacy Policy does not apply to other websites or advertisers. We advise you to consult the respective Privacy Policies of these third-party servers for more detailed information.</p>

        <h2>7. Children's Information</h2>
        <p>Auromind AI does not knowingly collect any Personal Identifiable Information from children under the age of 13. If you believe your child has provided us with personal information, please contact us immediately.</p>

        <h2>8. Changes to This Policy</h2>
        <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page with an updated revision date.</p>

        <h2>9. Contact Us</h2>
        <p>If you have any questions or suggestions about our Privacy Policy, please contact us via the <a href="?page=home#contact" style="color: var(--primary);">Contact Us</a> section on our website.</p>
    </div>
</div>

<?php elseif ($page === 'terms'): ?>
<!-- =================== TERMS & CONDITIONS =================== -->
<div class="content-page-wrap">
    <div class="content-box">
        <h1>Terms &amp; Conditions</h1>
        <div class="content-date">Last updated: <?php echo date('F d, Y'); ?></div>
        <p>Welcome to <strong>Auromind AI</strong>! These terms and conditions outline the rules and regulations for the use of Auromind AI's website and services. By accessing this website, we assume you accept these terms and conditions in full.</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing and using our services, you confirm that you are at least 18 years of age and agree to be bound by these Terms and Conditions and our Privacy Policy.</p>

        <h2>2. Intellectual Property</h2>
        <p>Unless otherwise stated, Auromind AI and/or its licensors own the intellectual property rights for all material on this website. All intellectual property rights are reserved. You may view and/or print pages for your own personal use, subject to restrictions set in these terms.</p>
        <p>You must not:</p>
        <ul>
            <li>Republish material from Auromind AI without attribution</li>
            <li>Sell, rent, or sub-license material from Auromind AI</li>
            <li>Reproduce, duplicate, or copy material from Auromind AI for commercial use</li>
            <li>Redistribute content from Auromind AI without explicit written permission</li>
        </ul>

        <h2>3. Disclaimer of Warranties</h2>
        <p>Our SaaS products — including the upcoming WhatsApp AI integration, Web applications, Android apps, and IoT services — are provided "as is". We do not make any warranty or representation about the accuracy or completeness of the content on this website.</p>

        <h2>4. Limitations of Liability</h2>
        <p>Auromind AI shall not be held liable for any indirect, incidental, special, or consequential damages arising out of or in any way connected with the use of our services.</p>

        <h2>5. WhatsApp Business API Compliance</h2>
        <p>Use of our WhatsApp AI SaaS product requires compliance with Meta's WhatsApp Business API policies. Users are responsible for ensuring their use of the platform complies with all applicable laws and WhatsApp's terms of service.</p>

        <h2>6. Privacy</h2>
        <p>Your use of our services is also governed by our <a href="?page=privacy" style="color: var(--primary);">Privacy Policy</a>, which is incorporated into these Terms and Conditions.</p>

        <h2>7. Modifications to Services</h2>
        <p>We reserve the right to modify or discontinue our services at any time without notice. We shall not be liable to you or to any third party for any modification, suspension, or discontinuation of the service.</p>

        <h2>8. Governing Law</h2>
        <p>These Terms shall be governed and construed in accordance with applicable laws. Any disputes arising in relation to these Terms shall be subject to the jurisdiction of the courts in India.</p>

        <h2>9. Contact Us</h2>
        <p>If you have any questions about these Terms and Conditions, please contact us via the <a href="?page=home#contact" style="color: var(--primary);">Contact Us</a> section on our website.</p>
    </div>
</div>

<?php else: ?>
<!-- =================== HOME PAGE =================== -->

<!-- SECTION 1: HERO -->
<section id="hero">
    <div class="hero-inner">
        <div class="hero-text">
            <span class="badge">🚀 &nbsp;Next-Gen AI Technology</span>
            <h1>Intelligent Solutions<br>for the <span class="gradient-text">Modern Business</span></h1>
            <p>Auromind AI is your trusted technology partner. We build powerful WhatsApp AI SaaS, enterprise web apps, Android applications, and cutting-edge IoT solutions to accelerate your growth.</p>
            <div class="hero-buttons">
                <a href="#contact" class="btn btn-primary">Get Started Free</a>
                <a href="#services" class="btn btn-outline">View Services</a>
            </div>
            <div class="hero-trust">
                <span><span class="trust-dot"></span> &nbsp;No credit card required</span>
                <span>·</span>
                <span>🔒 Enterprise Security</span>
                <span>·</span>
                <span>⚡ 24/7 Support</span>
            </div>
        </div>
        <div class="hero-visual">
            <div class="hero-visual-inner">
                <div class="mock-dash">
                    <div class="mock-dash-header">
                        <h4>AI Dashboard</h4>
                        <span class="mock-pill">● Live</span>
                    </div>
                    <div class="mock-stats">
                        <div class="mock-stat">
                            <div class="mock-stat-num">2.4k</div>
                            <div class="mock-stat-label">Messages Today</div>
                        </div>
                        <div class="mock-stat">
                            <div class="mock-stat-num">98%</div>
                            <div class="mock-stat-label">Resolution Rate</div>
                        </div>
                    </div>
                    <div class="mock-bar-wrap">
                        <div class="mock-bar-label">AI Response Accuracy</div>
                        <div class="mock-bar"><div class="mock-bar-fill" style="width:92%"></div></div>
                        <div class="mock-bar-label">Customer Satisfaction</div>
                        <div class="mock-bar"><div class="mock-bar-fill" style="width:87%"></div></div>
                        <div class="mock-bar-label">Bot Uptime</div>
                        <div class="mock-bar"><div class="mock-bar-fill" style="width:99%"></div></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- SECTION 2: TRUST BAR -->
<div class="trust-bar">
    <div class="marquee-track">
        <!-- First set -->
        <div class="marquee-item"><span class="marquee-icon">💬</span> WhatsApp Business API</div>
        <div class="marquee-item"><span class="marquee-icon">☁️</span> Cloud-Native Architecture</div>
        <div class="marquee-item"><span class="marquee-icon">🔐</span> SOC 2 Compliant</div>
        <div class="marquee-item"><span class="marquee-icon">🤖</span> AI & ML Powered</div>
        <div class="marquee-item"><span class="marquee-icon">📱</span> Android Development</div>
        <div class="marquee-item"><span class="marquee-icon">🔌</span> IoT Connectivity</div>
        <div class="marquee-item"><span class="marquee-icon">🌐</span> Full-Stack Web Apps</div>
        <div class="marquee-item"><span class="marquee-icon">🚀</span> Agile Delivery</div>
        <!-- Duplicate for seamless loop -->
        <div class="marquee-item"><span class="marquee-icon">💬</span> WhatsApp Business API</div>
        <div class="marquee-item"><span class="marquee-icon">☁️</span> Cloud-Native Architecture</div>
        <div class="marquee-item"><span class="marquee-icon">🔐</span> SOC 2 Compliant</div>
        <div class="marquee-item"><span class="marquee-icon">🤖</span> AI & ML Powered</div>
        <div class="marquee-item"><span class="marquee-icon">📱</span> Android Development</div>
        <div class="marquee-item"><span class="marquee-icon">🔌</span> IoT Connectivity</div>
        <div class="marquee-item"><span class="marquee-icon">🌐</span> Full-Stack Web Apps</div>
        <div class="marquee-item"><span class="marquee-icon">🚀</span> Agile Delivery</div>
    </div>
</div>

<!-- SECTION 3: ABOUT -->
<section class="section" id="about">
    <div class="container">
        <div class="about-grid">
            <div>
                <span class="section-tag">Who We Are</span>
                <h2 class="section-title">Pioneering the Future of<br><span class="gradient-text">Business Technology</span></h2>
                <p style="color:var(--text-muted); margin-bottom:1.5rem;">At Auromind AI, we believe artificial intelligence should be accessible, practical, and powerful for businesses of all sizes. As a forward-thinking technology company, we bridge the gap between complex AI capabilities and everyday business operations.</p>
                <p style="color:var(--text-muted); margin-bottom:1.5rem;">Our upcoming flagship product — a comprehensive WhatsApp AI SaaS platform — is designed to automate customer interactions, streamline support, and drive sales without human intervention, 24 hours a day.</p>
                <ul class="checklist">
                    <li><span class="check-icon">✓</span> Innovative, modern technology stack</li>
                    <li><span class="check-icon">✓</span> Customer-centric design approach</li>
                    <li><span class="check-icon">✓</span> Scalable, secure cloud infrastructure</li>
                    <li><span class="check-icon">✓</span> Dedicated support and partnership</li>
                </ul>
            </div>
            <div class="about-image-block">
                <div class="about-card">
                    <div class="about-card-inner">
                        <div class="about-feature-row">
                            <div class="about-icon">🤖</div>
                            <div class="about-feature-text">
                                <h5>AI-First Development</h5>
                                <p>Every product we build is engineered with artificial intelligence at its core, making your business smarter from day one.</p>
                            </div>
                        </div>
                        <div class="about-feature-row">
                            <div class="about-icon">🔒</div>
                            <div class="about-feature-text">
                                <h5>Enterprise-Grade Security</h5>
                                <p>End-to-end encryption, SOC 2 compliance, and strict data governance protect your business and your customers at all times.</p>
                            </div>
                        </div>
                        <div class="about-feature-row">
                            <div class="about-icon">📈</div>
                            <div class="about-feature-text">
                                <h5>Measurable Results</h5>
                                <p>We don't just build software — we deliver outcomes. Real metrics, real ROI, and real business growth for every client.</p>
                            </div>
                        </div>
                        <div class="about-feature-row">
                            <div class="about-icon">⚡</div>
                            <div class="about-feature-text">
                                <h5>Rapid Delivery</h5>
                                <p>Agile methodology and experienced engineers ensure your projects are delivered on time and on budget, every time.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- SECTION 4: SERVICES -->
<section class="section section-alt" id="services">
    <div class="container">
        <div class="text-center">
            <span class="section-tag">What We Build</span>
            <h2 class="section-title">Our Complete Tech Ecosystem</h2>
            <p class="section-subtitle">From conversational AI to embedded IoT systems — we engineer the technology that moves your business forward.</p>
        </div>
        <div class="services-grid">
            <div class="service-card">
                <div class="service-icon-wrap">💬</div>
                <h3>WhatsApp AI SaaS</h3>
                <p>Automate your entire customer communication workflow through WhatsApp. Our upcoming AI SaaS platform uses advanced NLP to understand context, intent, and sentiment — delivering human-like conversations at scale.</p>
                <ul>
                    <li>🔵 Automated customer support & sales</li>
                    <li>🔵 Multi-language conversations</li>
                    <li>🔵 CRM & e-commerce integrations</li>
                    <li>🔵 Real-time analytics dashboard</li>
                </ul>
            </div>
            <div class="service-card">
                <div class="service-icon-wrap">💻</div>
                <h3>Web Applications</h3>
                <p>Custom, scalable, and secure web applications built for the modern enterprise. From complex SaaS platforms to internal business tools, we deliver performant software on time, every time.</p>
                <ul>
                    <li>🔵 React, Next.js & Laravel development</li>
                    <li>🔵 RESTful APIs & microservices</li>
                    <li>🔵 Cloud-hosted & auto-scalable</li>
                    <li>🔵 SEO-optimized & accessible</li>
                </ul>
            </div>
            <div class="service-card">
                <div class="service-icon-wrap">📱</div>
                <h3>Android Development</h3>
                <p>Native and cross-platform Android applications with stunning UI and blazing-fast performance. We craft experiences that users love — from concept to the Play Store and beyond.</p>
                <ul>
                    <li>🔵 Native Kotlin & Flutter apps</li>
                    <li>🔵 Offline-first architecture</li>
                    <li>🔵 Push notifications & real-time sync</li>
                    <li>🔵 Google Play Store deployment</li>
                </ul>
            </div>
            <div class="service-card">
                <div class="service-icon-wrap">🔌</div>
                <h3>IoT Solutions</h3>
                <p>Connect the physical and digital worlds with intelligent IoT systems. We design and deploy sensor networks, edge computing solutions, and cloud-connected hardware for smart automation.</p>
                <ul>
                    <li>🔵 Embedded firmware development</li>
                    <li>🔵 MQTT & cloud connectivity</li>
                    <li>🔵 Remote monitoring dashboards</li>
                    <li>🔵 Predictive maintenance systems</li>
                </ul>
            </div>
        </div>
    </div>
</section>

<!-- SECTION 5: HOW IT WORKS -->
<section class="section" id="how-it-works">
    <div class="container">
        <div class="text-center">
            <span class="section-tag">Our Process</span>
            <h2 class="section-title">How We Work With You</h2>
            <p class="section-subtitle">A simple, transparent, and proven four-step process to take your idea from concept to a live product.</p>
        </div>
        <div class="steps-grid">
            <div class="step-card">
                <div class="step-number">1</div>
                <h3>Discovery</h3>
                <p>We listen, research, and understand your business goals, audience, and technical requirements to define a clear project scope.</p>
            </div>
            <div class="step-card">
                <div class="step-number">2</div>
                <h3>Design & Plan</h3>
                <p>Our designers and architects create wireframes, system designs, and a detailed project roadmap for your approval.</p>
            </div>
            <div class="step-card">
                <div class="step-number">3</div>
                <h3>Build & Test</h3>
                <p>We develop using agile sprints, with regular demos and rigorous QA testing to ensure a bug-free, high-performance product.</p>
            </div>
            <div class="step-card">
                <div class="step-number">4</div>
                <h3>Launch & Support</h3>
                <p>We deploy your product, monitor performance, and provide ongoing support and maintenance to ensure long-term success.</p>
            </div>
        </div>
    </div>
</section>

<!-- SECTION 6: WHY CHOOSE US -->
<section class="section section-alt" id="why-us">
    <div class="container">
        <div class="text-center">
            <span class="section-tag">Our Advantages</span>
            <h2 class="section-title">Why Businesses Choose Auromind AI</h2>
            <p class="section-subtitle">We go beyond just writing code — we become your technology partner, invested in your success.</p>
        </div>
        <div class="why-grid">
            <div class="why-card">
                <div class="why-card-icon">🧠</div>
                <h3>AI-First Mindset</h3>
                <p>Every solution we build is designed to leverage AI and machine learning to give your business a competitive edge.</p>
            </div>
            <div class="why-card">
                <div class="why-card-icon">🔒</div>
                <h3>Security by Default</h3>
                <p>Security is never an afterthought. We build end-to-end encrypted, compliance-ready systems from the ground up.</p>
            </div>
            <div class="why-card">
                <div class="why-card-icon">🌍</div>
                <h3>Global Standards</h3>
                <p>We follow international best practices in software engineering, accessibility, and data privacy regulations.</p>
            </div>
            <div class="why-card">
                <div class="why-card-icon">⚡</div>
                <h3>Fast & Agile</h3>
                <p>Rapid iteration cycles mean you see working software quickly, can give feedback early, and avoid costly mistakes.</p>
            </div>
            <div class="why-card">
                <div class="why-card-icon">📊</div>
                <h3>Data-Driven</h3>
                <p>We integrate analytics, dashboards, and reporting into every product so you can make informed decisions always.</p>
            </div>
            <div class="why-card">
                <div class="why-card-icon">🤝</div>
                <h3>Dedicated Partnership</h3>
                <p>You're not just a client — you're our partner. We stay with you through the full lifecycle of your product.</p>
            </div>
        </div>
    </div>
</section>

<!-- SECTION 7: STATS -->
<div class="stats-section">
    <div class="container">
        <div class="stats-grid">
            <div class="stat-item">
                <h3>10x</h3>
                <p>Faster Customer Responses</p>
            </div>
            <div class="stat-item">
                <h3>99.9%</h3>
                <p>Platform Uptime SLA</p>
            </div>
            <div class="stat-item">
                <h3>24/7</h3>
                <p>AI Always On</p>
            </div>
            <div class="stat-item">
                <h3>100%</h3>
                <p>Data Privacy Guaranteed</p>
            </div>
        </div>
    </div>
</div>

<!-- SECTION 8: PRODUCTS -->
<section class="section" id="products">
    <div class="container">
        <div class="text-center">
            <span class="section-tag">Product Portfolio</span>
            <h2 class="section-title">Our Product Suite</h2>
            <p class="section-subtitle">A growing family of intelligent products, each designed to solve a real business problem at scale.</p>
        </div>
        <div class="products-grid">
            <div class="product-card">
                <div class="product-card-header">
                    <div class="icon">💬</div>
                    <h3>AuroChat</h3>
                </div>
                <div class="product-card-body">
                    <p>Our flagship WhatsApp AI SaaS product. Automate conversations, handle support tickets, and close sales — all through WhatsApp Business API.</p>
                    <span class="product-tag">🔜 Coming Soon</span>
                </div>
            </div>
            <div class="product-card">
                <div class="product-card-header">
                    <div class="icon">🌐</div>
                    <h3>AuroWeb</h3>
                </div>
                <div class="product-card-body">
                    <p>Enterprise-grade web application development service. Full-stack, cloud-native, and built to handle millions of users with ease.</p>
                    <span class="product-tag">✅ Available Now</span>
                </div>
            </div>
            <div class="product-card">
                <div class="product-card-header">
                    <div class="icon">🔌</div>
                    <h3>AuroEdge</h3>
                </div>
                <div class="product-card-body">
                    <p>End-to-end IoT platform for industrial and commercial smart automation. From sensor to cloud, we handle the complete stack.</p>
                    <span class="product-tag">🔜 Coming Soon</span>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- SECTION 9: TESTIMONIALS -->
<section class="section section-alt" id="testimonials">
    <div class="container">
        <div class="text-center">
            <span class="section-tag">Testimonials</span>
            <h2 class="section-title">Trusted by Forward-Thinking Teams</h2>
            <p class="section-subtitle">Hear what early partners and beta users are saying about Auromind AI's technology.</p>
        </div>
        <div class="testimonials-grid">
            <div class="testimonial-card">
                <div class="stars">★★★★★</div>
                <p class="testimonial-text">"Auromind AI's approach to building our customer chatbot was phenomenal. The team understood our business deeply and delivered a WhatsApp bot that handles 80% of our queries automatically."</p>
                <div class="testimonial-author">
                    <div class="author-avatar">R</div>
                    <div>
                        <div class="author-name">Rajesh Kumar</div>
                        <div class="author-role">CEO, TechVentures India</div>
                    </div>
                </div>
            </div>
            <div class="testimonial-card">
                <div class="stars">★★★★★</div>
                <p class="testimonial-text">"The web application they built for us is fast, scalable, and absolutely beautiful. The team was professional, communicative, and delivered ahead of schedule. Highly recommended!"</p>
                <div class="testimonial-author">
                    <div class="author-avatar">P</div>
                    <div>
                        <div class="author-name">Priya Sharma</div>
                        <div class="author-role">CTO, RetailChain Pro</div>
                    </div>
                </div>
            </div>
            <div class="testimonial-card">
                <div class="stars">★★★★★</div>
                <p class="testimonial-text">"Our IoT monitoring dashboard built by Auromind AI reduced our factory downtime by 40%. The real-time data and alerts are game-changers for our manufacturing operation."</p>
                <div class="testimonial-author">
                    <div class="author-avatar">M</div>
                    <div>
                        <div class="author-name">Mohammed Ali</div>
                        <div class="author-role">Operations Director, SmartFactory</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- SECTION 10: FAQ -->
<section class="section" id="faq">
    <div class="container">
        <div class="text-center">
            <span class="section-tag">FAQs</span>
            <h2 class="section-title">Frequently Asked Questions</h2>
            <p class="section-subtitle">Quick answers to the questions we get asked most often.</p>
        </div>
        <div class="faq-grid">
            <div class="faq-item">
                <h4>What is the WhatsApp AI SaaS product? <span>+</span></h4>
                <p>AuroChat is our upcoming platform that connects to the WhatsApp Business API to let businesses automate customer conversations using AI, without any coding required.</p>
            </div>
            <div class="faq-item">
                <h4>Do I need to be a technical person to use it? <span>+</span></h4>
                <p>No. Our products are designed for business owners and teams. We provide an intuitive dashboard and onboarding support to get you started quickly.</p>
            </div>
            <div class="faq-item">
                <h4>Is my data safe with Auromind AI? <span>+</span></h4>
                <p>Absolutely. We use end-to-end encryption, secure cloud infrastructure, and strict data governance policies. We never sell or share your data with third parties.</p>
            </div>
            <div class="faq-item">
                <h4>Can you build a custom app for my business? <span>+</span></h4>
                <p>Yes! We specialize in custom web, Android, and IoT development. Contact us through the form below to discuss your project and get a free quote.</p>
            </div>
            <div class="faq-item">
                <h4>What industries do you serve? <span>+</span></h4>
                <p>We work across retail, e-commerce, manufacturing, healthcare, logistics, and more. Our technology is industry-agnostic and highly adaptable.</p>
            </div>
            <div class="faq-item">
                <h4>How long does it take to build an app? <span>+</span></h4>
                <p>Timelines depend on complexity. A basic web app takes 4–8 weeks; enterprise systems can take 3–6 months. We provide a detailed timeline after the discovery phase.</p>
            </div>
        </div>
    </div>
</section>

<!-- SECTION 11: CONTACT -->
<section class="section contact-section" id="contact">
    <div class="container">
        <div class="contact-grid">
            <div class="contact-info">
                <span class="section-tag">Contact Us</span>
                <h2 class="section-title">Let's Build Something<br><span class="gradient-text">Amazing Together</span></h2>
                <p>Whether you have a project in mind, want to join our waitlist, or just want to say hello — we'd love to hear from you.</p>

                <div class="contact-detail">
                    <div class="contact-detail-icon">📧</div>
                    <div class="contact-detail-text">
                        <h5>Email Us</h5>
                        <p>hello@auromindai.com</p>
                    </div>
                </div>
                <div class="contact-detail">
                    <div class="contact-detail-icon">💬</div>
                    <div class="contact-detail-text">
                        <h5>WhatsApp</h5>
                        <p>Chat with us on WhatsApp Business</p>
                    </div>
                </div>
                <div class="contact-detail">
                    <div class="contact-detail-icon">🌐</div>
                    <div class="contact-detail-text">
                        <h5>Website</h5>
                        <p>auromindai.com</p>
                    </div>
                </div>
            </div>

            <div class="form-card">
                <?php if ($form_success): ?>
                    <div class="alert alert-success">✅ Thank you! Your message has been received. We will be in touch within 24 hours.</div>
                <?php elseif ($form_error): ?>
                    <div class="alert alert-error">⚠️ <?= $form_error ?></div>
                <?php endif; ?>

                <form method="POST" action="?page=home#contact">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="name">Full Name *</label>
                            <input type="text" id="name" name="name" placeholder="Your full name" required value="<?= htmlspecialchars($_POST['name'] ?? '') ?>">
                        </div>
                        <div class="form-group">
                            <label for="email">Email Address *</label>
                            <input type="email" id="email" name="email" placeholder="you@company.com" required value="<?= htmlspecialchars($_POST['email'] ?? '') ?>">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="phone">Phone Number</label>
                            <input type="tel" id="phone" name="phone" placeholder="+91 98765 43210" value="<?= htmlspecialchars($_POST['phone'] ?? '') ?>">
                        </div>
                        <div class="form-group">
                            <label for="service">Interested In</label>
                            <select id="service" name="service">
                                <option value="">Select a service...</option>
                                <option value="whatsapp-ai">WhatsApp AI SaaS</option>
                                <option value="web-app">Web Application</option>
                                <option value="android">Android App</option>
                                <option value="iot">IoT Solution</option>
                                <option value="other">Other / General</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="message">Your Message *</label>
                        <textarea id="message" name="message" placeholder="Tell us about your project or idea..." required><?= htmlspecialchars($_POST['message'] ?? '') ?></textarea>
                    </div>
                    <button type="submit" name="contact_submit" class="btn btn-primary" style="width:100%; justify-content:center; font-size:1rem;">
                        Send Message &rarr;
                    </button>
                    <p style="font-size:0.8rem; color:var(--text-muted); text-align:center; margin-top:1rem;">By submitting this form, you agree to our <a href="?page=privacy" style="color:var(--primary);">Privacy Policy</a>.</p>
                </form>
            </div>
        </div>
    </div>
</section>

<!-- SECTION 12: CTA BANNER -->
<div class="cta-banner">
    <h2>Ready to Transform Your Business?</h2>
    <p>Join hundreds of businesses getting ready for the AI revolution with Auromind AI.</p>
    <div class="cta-banner-btns">
        <a href="#contact" class="btn btn-white">Get Started Today</a>
        <a href="#services" class="btn" style="background:rgba(255,255,255,0.15); color:#fff; border:2px solid rgba(255,255,255,0.4);">View All Services</a>
    </div>
</div>

<?php endif; ?>
</main>

<!-- ===================== FOOTER ===================== -->
<footer>
    <div class="container">
        <div class="footer-grid">
            <div class="footer-brand">
                <div class="logo-container">
                    <img src="logo.png" alt="Auromind AI Logo" class="logo-img-footer">
                    <span style="font-family:'Outfit',sans-serif; font-size:1.35rem; font-weight:800; color:#fff;">Auromind AI</span>
                </div>
                <p>Building the future of conversational AI, enterprise web, mobile, and IoT technology to help businesses scale intelligently.</p>
            </div>
            <div class="footer-col">
                <h4>Company</h4>
                <ul>
                    <li><a href="?page=home#about">About Us</a></li>
                    <li><a href="?page=home#services">Services</a></li>
                    <li><a href="?page=home#products">Products</a></li>
                    <li><a href="?page=home#contact">Contact</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <h4>Services</h4>
                <ul>
                    <li><a href="?page=home#services">WhatsApp AI</a></li>
                    <li><a href="?page=home#services">Web Apps</a></li>
                    <li><a href="?page=home#services">Android Dev</a></li>
                    <li><a href="?page=home#services">IoT Solutions</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <h4>Legal</h4>
                <ul>
                    <li><a href="?page=privacy">Privacy Policy</a></li>
                    <li><a href="?page=terms">Terms of Service</a></li>
                </ul>
            </div>
        </div>
        <div class="footer-bottom">
            <span>&copy; <?php echo date('Y'); ?> Auromind AI. All rights reserved.</span>
            <div class="footer-bottom-links">
                <a href="?page=privacy">Privacy Policy</a>
                <a href="?page=terms">Terms of Service</a>
            </div>
        </div>
    </div>
</footer>

<script>
    // Sticky header shadow on scroll
    const header = document.getElementById('site-header');
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 20);
    });

    // Mobile menu toggle
    const menuBtn = document.getElementById('mobile-menu-btn');
    const navMenu = document.getElementById('nav-menu');
    
    if(menuBtn && navMenu) {
        menuBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    // Smooth scroll for anchor links and close mobile menu on click
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                // Close menu if open
                if(navMenu.classList.contains('active')) {
                    navMenu.classList.remove('active');
                }
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
</script>

</body>
</html>
