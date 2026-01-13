

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
          <p><strong>Last Updated: January 10, 2026</strong></p>

          <section>
            <h3 className="font-bold text-white mb-2">제1조 (목적) / Article 1 (Purpose)</h3>
            <p>본 약관은 이용자가 Content OS(이하 '서비스')가 제공하는 모든 서비스의 이용 조건, 절차, 권리, 의무, 책임사항 및 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
            <p className="text-gray-400 mt-1 text-xs">These terms and conditions aim to define the terms of use, procedures, rights, obligations, responsibilities, and other necessary matters between the user and Content OS (the "Service") for all services provided.</p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">제2조 (YouTube 서비스 약관 준수) / Article 2 (Compliance with YouTube Terms of Service)</h3>
            <p>본 서비스는 YouTube API 서비스를 사용합니다. 따라서 본 서비스의 모든 이용자는 YouTube 서비스 약관에 동의하는 것으로 간주됩니다. YouTube 서비스 약관을 주의 깊게 읽어보시기 바랍니다.</p>
            <p className="text-gray-400 mt-1 text-xs">This Service uses YouTube API Services. Therefore, all users of this Service are deemed to agree to the YouTube Terms of Service. Please read the YouTube Terms of Service carefully.</p>
            <p className="mt-2">
              <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                YouTube Terms of Service (https://www.youtube.com/t/terms)
              </a>
            </p>
          </section>
          
          <section>
            <h3 className="font-bold text-white mb-2">제3조 (서비스의 제공 및 성격) / Article 3 (Provision and Nature of Services)</h3>
            <p>서비스는 다음 업무를 수행합니다:</p>
            <p className="text-gray-400 mt-1 text-xs">The Service performs the following tasks:</p>
            <ul className="list-disc list-inside pl-4 mt-2 space-y-1">
              <li>공식 YouTube Data API를 통한 YouTube 공개 데이터의 검색 및 표시.</li>
              <li className="text-gray-400 text-xs">Retrieval and display of public YouTube data via the official YouTube Data API.</li>
              <li>API에서 얻은 원시 데이터를 기반으로 한 통계적 요약 제공. 서비스는 독립적인 측정 기준이나 계산된 점수를 생성하지 않습니다.</li>
              <li className="text-gray-400 text-xs">Provision of statistical summaries based on raw data obtained from the API. The Service does NOT create independent metrics or calculated scores.</li>
            </ul>
            <p className="mt-2">서비스는 기술 사양 또는 API 정책 변경 시 향후 계약에 따라 제공될 서비스의 내용을 변경할 수 있습니다.</p>
            <p className="text-gray-400 mt-1 text-xs">The Service may change the content of services to be provided under future contracts in the event of changes in technical specifications or API policies.</p>
          </section>
          
          <section>
            <h3 className="font-bold text-white mb-2">제4조 (서비스의 중단) / Article 4 (Interruption of Service)</h3>
            <p>서비스는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신의 두절 등의 사유가 발생한 경우에는 서비스의 제공을 일시적으로 중단할 수 있습니다. 또한, YouTube API 서비스의 정책 변경이나 종료로 인해 서비스의 일부 또는 전부가 중단될 수 있습니다.</p>
            <p className="text-gray-400 mt-1 text-xs">The Service may temporarily suspend the provision of services in case of maintenance, replacement, or breakdown of information and communication facilities such as computers, or communication failures. Furthermore, some or all of the services may be suspended due to policy changes or termination of the YouTube API Services.</p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">제5조 (면책 조항) / Article 5 (Disclaimer)</h3>
            <p>서비스는 API를 통해 제공되는 데이터의 정확성이나 완전성을 보증하지 않으며, 이 데이터를 기반으로 한 사용자의 투자나 결정에 대해 어떠한 책임도 지지 않습니다. 모든 분석 결과는 참고용으로만 사용되어야 합니다.</p>
            <p className="text-gray-400 mt-1 text-xs">The Service does not guarantee the accuracy or completeness of the data provided by the API and is not responsible for any user investments or decisions made based on this data. All analysis results should be used for reference purposes only.</p>
          </section>
          
          <section>
            <h3 className="font-bold text-white mb-2">제6조 (리버스 엔지니어링 금지) / Article 6 (Prohibition of Reverse Engineering)</h3>
            <p>사용자는 서비스 또는 서비스에 포함된 YouTube API 서비스를 수정, 번역, 파생 저작물 제작, 리버스 엔지니어링, 디컴파일, 디스어셈블하거나 기타 방식으로 기본 소스 코드를 추출하려고 시도해서는 안 됩니다.</p>
            <p className="text-gray-400 mt-1 text-xs">Users must not modify, translate, create derivative works of, reverse engineer, decompile, disassemble, or otherwise attempt to extract the underlying source code from the Service or any YouTube API Services contained therein.</p>
          </section>

          <section>
            <h3 className="font-bold text-white mb-2">제7조 (접근 권한 철회) / Article 7 (Revocation of Access)</h3>
            <p>사용자는 언제든지 Google 보안 설정 페이지를 통해 서비스의 데이터 접근 권한을 철회할 수 있습니다.</p>
            <p className="text-gray-400 mt-1 text-xs">Users can revoke the Service's access to their data at any time via the Google Security Settings page.</p>
            <p className="mt-2">
              <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                Google Security Settings (https://myaccount.google.com/permissions)
              </a>
            </p>
          </section>
        </div>
        <div className="p-4 border-t border-gray-700 text-right">
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-md">Close</button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;