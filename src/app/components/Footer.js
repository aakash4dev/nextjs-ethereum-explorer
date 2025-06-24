import { FaGithub, FaLinkedin, FaTwitter, FaYoutube, FaMedium, FaGlobe, FaEnvelope } from "react-icons/fa";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-200 border-t-4 border-t-cyan-400/70 mt-8 py-8">
      <div className="container mx-auto flex flex-col items-center gap-4 px-4">
        <div className="flex flex-col items-center gap-2">
          <Image src="/aakash_me.webp" alt="Aakash Singh Rajput" width={72} height={72} className="rounded-full border-4 border-cyan-400 shadow-lg object-cover" />
          <div className="font-bold text-lg text-cyan-300 mt-2">Made by Aakash Singh Rajput</div>
          <div>MIT License: Anyone can use this code for any purpose</div>
          <div className="flex gap-4 text-2xl mt-2">
            <a href="https://www.aakash4dev.com" target="_blank" rel="noopener noreferrer" title="Profile" className="hover:text-cyan-400 transition-colors"><FaGlobe /></a>
            <a href="https://github.com/aakash4dev" target="_blank" rel="noopener noreferrer" title="GitHub" className="hover:text-cyan-400 transition-colors"><FaGithub /></a>
            <a href="https://linkedin.com/in/aakash4dev" target="_blank" rel="noopener noreferrer" title="LinkedIn" className="hover:text-cyan-400 transition-colors"><FaLinkedin /></a>
            <a href="https://twitter.com/aakash4dev" target="_blank" rel="noopener noreferrer" title="Twitter" className="hover:text-cyan-400 transition-colors"><FaTwitter /></a>
            <a href="https://www.youtube.com/@aakash4dev" target="_blank" rel="noopener noreferrer" title="YouTube" className="hover:text-cyan-400 transition-colors"><FaYoutube /></a>
            <a href="https://medium.com/@aakash4dev" target="_blank" rel="noopener noreferrer" title="Medium" className="hover:text-cyan-400 transition-colors"><FaMedium /></a>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300 mt-2">
            <FaEnvelope className="text-cyan-400" />
            <a href="mailto:aakash4dev.me@gmail.com" className="hover:underline hover:text-cyan-400">aakash4dev.me@gmail.com</a>
          </div>
        </div>
      </div>
    </footer>
  );
} 