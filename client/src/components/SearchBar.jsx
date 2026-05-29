import SearchDropdown from "./SearchDropdown";

export default function SearchBar() {
  return (
    <SearchDropdown
      size="lg"
      placeholder="Nhập Kanji, Hiragana hoặc tiếng Việt..."
      wrapperClassName="w-full max-w-2xl mx-auto"
      inputClassName="w-full pl-12 pr-20 py-3 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition shadow-sm bg-white"
    />
  );
}
