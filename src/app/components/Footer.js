import { FaGithub, FaLinkedin, FaTwitter, FaYoutube, FaMedium, FaGlobe, FaEnvelope } from "react-icons/fa";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-[#f8f9fa] text-[#212529] border-t border-gray-200 mt-8 py-8">
      <div className="container mx-auto flex flex-col items-center gap-4 px-4">
        <div className="flex flex-col items-center gap-2">
          <Image src="/aakash_me.webp" alt="Aakash Singh Rajput" width={72} height={72} className="rounded-full border-4 border-[#0784c3] shadow-lg object-cover" />
          <div className="font-bold text-lg text-[#0784c3] mt-2">Made by Aakash Singh Rajput</div>
          <div className="text-gray-600 text-sm">Licensed under the MIT License. Copyright © {new Date().getFullYear()} Aakash Singh Rajput.</div>
          <div className="flex gap-4 text-xl mt-2 text-gray-500">
            <a href="https://www.aakash4dev.com" target="_blank" rel="noopener noreferrer" title="Profile" className="hover:text-[#0784c3] transition-colors"><FaGlobe /></a>
            <a href="https://github.com/aakash4dev" target="_blank" rel="noopener noreferrer" title="GitHub" className="hover:text-[#0784c3] transition-colors"><FaGithub /></a>
            <a href="https://linkedin.com/in/aakash4dev" target="_blank" rel="noopener noreferrer" title="LinkedIn" className="hover:text-[#0784c3] transition-colors"><FaLinkedin /></a>
            <a href="https://twitter.com/aakash4dev" target="_blank" rel="noopener noreferrer" title="Twitter" className="hover:text-[#0784c3] transition-colors"><FaTwitter /></a>
            <a href="https://www.youtube.com/@aakash4dev" target="_blank" rel="noopener noreferrer" title="YouTube" className="hover:text-[#0784c3] transition-colors"><FaYoutube /></a>
            <a href="https://medium.com/@aakash4dev" target="_blank" rel="noopener noreferrer" title="Medium" className="hover:text-[#0784c3] transition-colors"><FaMedium /></a>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
            <FaEnvelope className="text-[#0784c3]" />
            <a href="mailto:aakash4dev.me@gmail.com" className="hover:underline hover:text-[#0784c3]">aakash4dev.me@gmail.com</a>
          </div>
        </div>
      </div>
    </footer>
  );
} 