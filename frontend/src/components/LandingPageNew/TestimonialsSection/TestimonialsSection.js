'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

const testimonials = [
  {
    name: 'Sarah Jenkins',
    role: 'Director @ Shopease',
    review:
      'Auromind completely transformed our customer support workflow, helping us handle 3x more inquiries while significantly increasing our conversion rates.',
    rating: 4,
    image: '/avatars/avatar-1.png',
  },
  {
    name: 'Michael Carter',
    role: 'Founder @ BrightLabs',
    review:
      'Since switching to Auromind, our response time dropped dramatically and our team now closes leads much faster than before.',
    rating: 5,
    image: '/avatars/avatar-2.png',
  },
  {
    name: 'Emily Rodriguez',
    role: 'Marketing Lead @ NovaEdge',
    review:
      'The automation features saved us countless hours every week. We were able to improve customer satisfaction without expanding our team.',
    rating: 5,
    image: '/avatars/avatar-3.png',
  },
  {
    name: 'David Lee',
    role: 'Operations Manager @ ScaleFlow',
    review:
      'Auromind made our support process seamless. Our customers receive faster replies and our internal workflow is now much more efficient.',
    rating: 4,
    image: '/avatars/avatar-4.png',
  },
];

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 60,
  },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      delay: index * 0.12,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

function Star({ filled }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`w-4 h-4 ${filled ? 'text-[#FACC15]' : 'text-white opacity-80'}`}
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81H7.03a1 1 0 00.951-.69l1.068-3.292z" />
    </svg>
  );
}

export default function TestimonialsSection() {
  return (
    <section className="relative overflow-hidden bg-black py-24 md:py-32 font-[Poppins]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center">
          <h2 className="font-['Poppins'] text-[50px] font-medium text-white tracking-[-0.04em] leading-[1.1em] text-center max-w-[900px] mx-auto">
            How Businesses Are
            <br />
            Growing with Us
          </h2>

          <p className="mt-6 text-base md:text-lg text-white/60 font-[400] text-center">
            Client feedback highlighting real results and satisfaction
          </p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              custom={index}
              variants={cardVariants}
              className="relative overflow-hidden rounded-[18px] border border-white/10 bg-[#050505] w-[490px] h-[185px] px-[28px] py-[22px] transition-all duration-500 hover:border-white/20 hover:-translate-y-1"
            >
              <div className="absolute bottom-[-120px] right-[-70px] h-[260px] w-[260px] rounded-full bg-[#6D28D9]/30 blur-[85px]" />

              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/95 to-transparent" />

              <div className="relative z-10">
                <div className="flex items-center gap-3">
                  <Image
                    src={testimonial.image}
                    alt={testimonial.name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover border border-white/10"
                  />

                  <div>
                    <h3 className="font-['Poppins'] text-[14px] font-semibold leading-[1.4em] tracking-[-0.02em] text-[#FFFFFF]">
                      {testimonial.name}
                    </h3>
                    <p className="mt-1 text-[11px] text-white/45 font-[400]">
                      {testimonial.role}
                    </p>
                  </div>
                </div>

                <p className="mt-[24px] mr-[39px] font-['Poppins'] text-[14px] font-medium leading-[1.4em] tracking-[-0.02em] text-[#CCCCCC] w-[430px]">
                  “{testimonial.review}”
                </p>

                <div className="mt-[10px] flex items-center gap-1">
                  {[...Array(5)].map((_, starIndex) => (
                    <Star key={starIndex} filled={starIndex < testimonial.rating} />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}