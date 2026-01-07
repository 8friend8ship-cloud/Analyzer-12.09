
import React from 'react';

interface TermsModalProps {
  onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">서비스 이용 약관 (Terms of Service)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto text-sm text-gray-300 space-y-4">
          <p><strong>최종 업데이트: 2026년 1월 7일</strong></p>

          <section>
            <h3 className="font-bold text-white mb-2">제1조 (목적)</h3>
            <p>본 약관은 Content OS(이하 '서비스')가 제공하는 모든 서비스의 이용 조건 및 절차, 이용자와 서비스의 권리, 의무 및 책임사항 등 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">제2조 (YouTube 서비스 약관 준수)</h3>
            <p>본 서비스는 YouTube API 서비스를 사용합니다. 따라서 본 서비스를 이용하는 모든 사용자는 YouTube 서비스 약관에 동의하는 것으로 간주됩니다. YouTube 서비스 약관을 주의 깊게 읽어보시기 바랍니다.</p>
            <p className="mt-2">
              <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                YouTube 서비스 약관 (https://www.youtube.com/t/terms)
              </a>
            </p>
          </section>
          
          <section>
            <h3 className="font-bold text-white mb-2">제3조 (서비스의 제공 및 변경)</h3>
            <p>1. 서비스는 다음과 같은 업무를 수행합니다.</p>
            <ul className="list-decimal list-inside pl-4 mt-2">
              <li>YouTube 공개 데이터를 활용한 분석 정보 제공</li>
              <li>기타 서비스가 개발하거나 다른 회사와의 제휴계약 등을 통해 이용자에게 제공하는 일체의 서비스</li>
            </ul>
            <p>2. 서비스는 기술적 사양의 변경 등의 경우에는 장차 체결되는 계약에 의해 제공할 서비스의 내용을 변경할 수 있습니다.</p>
          </section>
          
          <section>
            <h3 className="font-bold text-white mb-2">제4조 (서비스의 중단)</h3>
            <p>서비스는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신의 두절 등의 사유가 발생한 경우에는 서비스의 제공을 일시적으로 중단할 수 있습니다. 또한, YouTube API 서비스의 정책 변경이나 중단에 따라 서비스의 일부 또는 전체가 중단될 수 있습니다.</p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">제5조 (면책조항)</h3>
            <p>서비스는 API로부터 제공받는 데이터의 정확성이나 완전성을 보증하지 않으며, 해당 데이터를 활용한 사용자의 투자나 결정에 대해 어떠한 책임도 지지 않습니다. 모든 분석 결과는 참고용으로만 활용해야 합니다.</p>
          </section>
        </div>
        <div className="p-4 border-t border-gray-700 text-right">
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-md">닫기</button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
