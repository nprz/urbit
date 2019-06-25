module Vere.Pier.Types where

import ClassyPrelude
import Data.Void
import Data.Noun
import Data.Noun.Atom
import Data.Noun.Poet
import Database.LMDB.Raw
import Urbit.Time

import qualified Vere.Http.Server as Server
import qualified Vere.Http.Client as Client

data WTFIsThis
  = WTFIsThis (Maybe Varience) Eff

data Event
  = BehnBorn
  | HttpBorn
  | CttpBorn
  deriving (Eq, Ord, Show)

data Eff
  = HttpServer Server.Eff
  | HttpClient Client.Eff
  | Behn Void
  | Clay Void
  | Boat Void
  | Sync Void
  | Newt Void
  | Ames Void
  | Init Void
  | Term Void
  deriving (Eq, Ord, Show)

instance ToNoun Eff where

instance FromNoun Eff where


data Varience = Gold | Iron | Lead

type Perform = Eff -> IO ()

newtype Path = Path [Text]
  deriving (Eq, Ord, Show)

data Ovum = Ovum Path Event
  deriving (Eq, Ord, Show, ToNoun, FromNoun)

newtype Mug = Mug Word32
  deriving newtype (Eq, Ord, Show, ToNoun, FromNoun)

newtype Jam = Jam Atom

data IODriver = IODriver
  { bornEvent   :: IO Ovum
  , startDriver :: (Ovum -> STM ()) -> IO (Async (), Perform)
  }


data Writ a = Writ
  { eventId          :: Word64
  , timeout          :: Maybe Word
  , event            :: Jam           -- mat
  , payload          :: a
  }

data Pier = Pier
  { computeQueue :: TQueue Ovum
  , persistQueue :: TQueue (Writ [Eff])
  , releaseQueue :: TQueue (Writ [Eff])
  , logState :: LogState
  , driverThreads :: [(Async (), Perform)]
  , portingThread :: Async ()
  }

newtype EventLog = EventLog MDB_env

-- TODO: We are uncertain about q's type. There's some serious entanglement
-- with u3_pier in this logic in the C code, and you might not be able to get
-- away with anything less than passing the full u3_writ around.
data LogState = LogState
  { env        :: MDB_env
  , inputQueue :: TQueue (Writ [Eff])
  , onPersist  :: Writ [Eff] -> STM ()
  , writer     :: Async ()
  }

data LogIdentity = LogIdentity
  { who     :: Noun
  , is_fake :: Noun
  , life    :: Noun
  } deriving (Show)

instance ToNoun LogIdentity where
  toNoun LogIdentity{..} = toNoun (who, is_fake, life)

instance FromNoun LogIdentity where
  parseNoun n = do
    (who, is_fake, life) <- parseNoun n
    pure (LogIdentity{..})
