import Modal from 'react-modal'
import QRCode from 'qrcode'
import useAsyncRefresh from '../../../hooks/useAsyncRefresh'
import { useRef } from 'react'
import Stamp from './Stamp'
import clsx from 'clsx'
import { useData } from '../../../hooks/useData'
import { IoMdWarning } from 'react-icons/io'
import { FaImage } from 'react-icons/fa6'
import download from 'downloadjs'
import { Candidate, Seat } from '../../../hooks/useData/useLoadData'
import { useLocation } from 'react-router-dom'
import html2canvas from 'html2canvas'

const SampleBallot = ({
  selectedSeat,
  isOpen,
  closeModal
}: {
  selectedSeat: Seat
  isOpen: boolean
  closeModal: () => void
}) => {
  const ballotPaperRef = useRef<HTMLDivElement>(null)
  const [{ issues }] = useData()

  const currentURL = useLocation()
  // const navigate = useNavigate()

  // const toDownload =
  //   currentURL.pathname.split('/').filter((el) => el !== '')[2] === 'download'

  if (!selectedSeat.candidates) {
    return null
  }

  const downloadBallotPaperFromElement = async () => {
    if (!ballotPaperRef.current) return

    try {
      const canvas = await html2canvas(ballotPaperRef.current, {
        useCORS: true,
        allowTaint: true
      })
      download(
        canvas.toDataURL('image/png'),
        selectedSeat.seat + '_Ballot_Paper.png'
      )
    } catch (e) {
      console.error(e)
    }
  }

  const [reordering, highest_index] = (() => {
    const reordering: {
      [key: number]: number
    } = {}

    const NO_COLS = 3
    const noRows = Math.ceil(selectedSeat.candidates.length / NO_COLS)

    let highest_index = 0

    for (let i = 0; i < selectedSeat.candidates.length; i++) {
      const colIndex = Math.floor(i / noRows)
      const moveTo = (i - colIndex * noRows) * NO_COLS + colIndex
      reordering[moveTo] = i

      highest_index = Math.max(highest_index, moveTo)
    }

    return [reordering, highest_index]
  })()

  const { value: QRCodeURL } = useAsyncRefresh(() => {
    return new Promise((resolve, reject) => {
      QRCode.toDataURL(
        `https://azaadvote.com/${selectedSeat.seat}/ballot-paper`,
        function (err, url) {
          resolve(url)
        }
      )
    })
  }, [selectedSeat.seat])

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={closeModal}
      contentLabel="Sample Ballot Paper"
      style={{
        overlay: {
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        },
        content: {
          position: 'static',
          display: 'flex',
          flexDirection: 'column',
          width: 620,
          padding: 0,
          borderRadius: 0,
          maxHeight: '80vh',
          backgroundColor: 'transparent',
          border: 'none'
        }
      }}
    >
      <div className="flex flex-col flex-1 overflow-auto">
        {issues.knownIssues.includes(selectedSeat.seat) ? (
          <div className="flex bg-yellow-50 px-3 py-4 font-bold items-center text-yellow-600">
            <IoMdWarning className="mr-4 text-4xl" />
            <span className="text-sm">
              Known issues in ballot paper of this constituency because of bad
              data quality from ECP.{' '}
              <a
                href={'https://fix.azaadvote.com/' + selectedSeat.seat}
                className="text-blue-500 hover:underline"
                target="_blank"
              >
                See ECP Form-33.
              </a>
            </span>
          </div>
        ) : null}
        <div
          className="flex flex-col"
          style={{
            border: '5px solid #ef4444',
            borderStyle: 'dashed'
          }}
        >
          <div
            ref={ballotPaperRef}
            className="flex flex-col px-3 py-3"
            style={{
              backgroundColor: '#c9e5d6'
            }}
          >
            <div className="flex items-center justify-center font-mono font-bold mb-2 text-2xl">
              {selectedSeat.seat + ' '}
              {selectedSeat.pti_data.constituency_name}
            </div>
            <div className="flex font-mono font-bold text-xl mb-4 px-4 pt-2 pb-4">
              <div className="tracking-tighter">Sample Ballot Paper</div>
              <div className="ml-auto text-right">سیمپل بیلٹ پیپر</div>
            </div>
            {!issues.problematicSeats.includes(selectedSeat.seat) ? (
              <div
                className="grid grid-cols-3 auto-rows-max w-full h-full gap-1 "
                dir="rtl"
              >
                {new Array(highest_index + 1).fill(true).map((_, i) => {
                  const index = reordering[i]
                  if (index === undefined) {
                    return <div key={i} className="w-full h-full"></div>
                  }
                  const candidate = selectedSeat.candidates?.[
                    index
                  ] as Candidate
                  return (
                    <div
                      key={candidate.symbol_url}
                      className={clsx(
                        'relative text-sm md:text-lg px-2 py-2 flex items-center w-full border border-black',
                        candidate.pti_backed && '!border-4 border-red-500 '
                      )}
                      style={{ borderWidth: '0.5px' }}
                    >
                      {candidate.pti_backed && (
                        <div
                          className="absolute"
                          style={{
                            left: 8,
                            top: 8
                          }}
                        >
                          <Stamp />
                        </div>
                      )}
                      <div className="ml-auto font-urdu pb-2">
                        {candidate.candidate_urdu_name}
                      </div>
                      <img
                        crossOrigin="anonymous"
                        className="w-6 h-6 md:w-12 md:h-12 mr-2"
                        src={candidate.symbol_url}
                      />
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col px-4 font-mono text-red-600">
                <div className="flex items-center font-bold mb-3">
                  <IoMdWarning className="mr-3 text-xl" /> Sample ballot paper
                  not available for this constituency.
                </div>
                <div>
                  Sample ballot paper not available for{' '}
                  {issues.problematicSeats.length} constituencies, waiting for
                  data from PTI team.
                </div>
              </div>
            )}
            <div className="flex pt-3 mt-1 items-center border-dashed">
              <div className="font-mono tracking-tight">
                https://azaadvote.com/{selectedSeat.seat}/ballot-paper
              </div>
              <img
                className="ml-auto"
                src={QRCodeURL}
                style={{ width: '3em', height: '3em' }}
              />
            </div>
          </div>
        </div>
      </div>
      <button
        className="flex mt-4 mb-3 ml-auto w-fit items-center bg-white shadow rounded-md px-3 py-2 select-none cursor-pointer font-bold font-mono tracking-tighter border border-transparent active:shadow-none active:border-gray-100 transition cursor-pointer z-50 ml-3 text-red-500"
        onClick={
          () => downloadBallotPaperFromElement()
          // download(
          //   `https://files.azaadvote.com/${selectedSeat.seat}_Ballot_Paper.png`
          // )
        }
      >
        <FaImage className="mr-3 text-2xl" />
        Download Image
      </button>
    </Modal>
  )
}

export default SampleBallot
